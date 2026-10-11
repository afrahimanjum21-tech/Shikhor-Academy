import axios from 'axios';
import { API_BASE_URL } from './config';
import { cleanPath, applyUnwrap, invalidationNamespace, keyPathInvalidated, CROSS_INVALIDATE } from './responseUnwrap';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Client-side GET cache: page navigation was making the same API calls over
// and over (~600ms+ each on the serverless+remote-DB stack), so every page
// load felt slow. Cached GETs resolve instantly (memory, else sessionStorage)
// for TTL seconds; writes invalidate the affected namespace so data refreshes
// naturally after any mutation.
const CACHE_TTL_PUBLIC = 300000; // public data rarely changes
const CACHE_TTL_AUTH = 30000;    // panel data: short TTL for freshness
const CACHE_MAX_ENTRIES = 60;
const NO_CACHE_PATHS = [
    '/verify-credential-change',
    '/notifications/unread-count',
    '/notifications/counts',
    '/student/payment/status',
];
const cacheStore = new Map();
let cacheHydrated = false;

const hydrateCache = () => {
    if (cacheHydrated) return;
    cacheHydrated = true;
    try {
        const raw = sessionStorage.getItem('api-cache-v1');
        if (!raw) return;
        const entries = JSON.parse(raw);
        if (typeof entries !== 'object') return;
        Object.entries(entries).forEach(([k, v]) => {
            if (v && typeof v.expiresAt === 'number') cacheStore.set(k, v);
        });
    } catch (e) {
        // Corrupt or unavailable storage — start with an empty cache.
    }
};

const persistCache = () => {
    try {
        const entries = {};
        cacheStore.forEach((v, k) => { entries[k] = v; });
        sessionStorage.setItem('api-cache-v1', JSON.stringify(entries));
    } catch (e) {
        // Storage full or unavailable — keep working without persistence.
    }
};

// J: the JWT now lives ONLY in a HttpOnly cookie, so it is no longer readable
// here. Namespace the per-user cache by the (non-secret) stored USER id instead
// of the token, so one account never serves another account's cached GETs.
const currentUserTag = () => {
    try {
        const u = JSON.parse(localStorage.getItem('USER') || 'null');
        return u && u.id != null ? `u${u.id}` : 'anon';
    } catch {
        return 'anon';
    }
};

// Read a readable (non-HttpOnly) cookie — used for the CSRF double-submit token.
const readCookie = (name) => {
    if (typeof document === 'undefined' || !document.cookie) return '';
    const hit = document.cookie.split('; ').find((c) => c.indexOf(`${name}=`) === 0);
    if (!hit) return '';
    try { return decodeURIComponent(hit.substring(name.length + 1)); } catch { return ''; }
};
const CSRF_COOKIE = 'uttoron_csrf';

const buildCacheKey = (config) => {
    const token = currentUserTag();
    let url = config.url || '';
    if (config.params) {
        const qs = new URLSearchParams();
        Object.entries(config.params).forEach(([k, v]) => {
            if (v === undefined || v === null || v === '') return;
            qs.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
        });
        const s = qs.toString();
        if (s) url += (url.includes('?') ? '&' : '?') + s;
    }
    return url + '|' + token;
};

const cacheTtlFor = (path) => (path.startsWith('/public/') ? CACHE_TTL_PUBLIC : CACHE_TTL_AUTH);

const cacheGet = (key, now) => {
    const hit = cacheStore.get(key);
    if (!hit) return null;
    if (now < hit.expiresAt) return hit.payload;
    cacheStore.delete(key);
    return null;
};

const cacheSet = (key, payload, ttl, now) => {
    cacheStore.set(key, { payload, expiresAt: now + ttl });
    if (cacheStore.size > CACHE_MAX_ENTRIES) {
        const oldest = cacheStore.keys().next().value;
        if (oldest) cacheStore.delete(oldest);
    }
    persistCache();
};

// A mutation invalidates the subtree of its first two path segments, so
// POST /admin/attendance/cell clears /admin/attendance/* (monthly sheet,
// leave requests, stats) and POST /admin/exams/marks clears /admin/exams/*.
// Namespace + match logic is pure + unit-tested in ./responseUnwrap. The match
// strips each key's ?query so PAGINATED keys (…?page=2) are cleared too (I-10).
const invalidateCache = (url) => {
    const ns = invalidationNamespace(url);
    if (!ns) return;
    const extra = CROSS_INVALIDATE[ns] || [];

    let changed = false;
    cacheStore.forEach((v, k) => {
        const keyPath = k.slice(0, k.lastIndexOf('|'));
        if (keyPathInvalidated(keyPath, ns, extra)) {
            cacheStore.delete(k);
            changed = true;
        }
    });
    if (changed) persistCache();
};

// Every tab keeps its own cache store (sessionStorage is per-tab), so a
// mutation in one tab would leave every other tab serving stale GETs for up
// to the TTL. localStorage is shared, so broadcast the invalidated URL via a
// unique marker; the 'storage' event fires in all other tabs, which then
// purge the same keys from their own stores.
const CACHE_BUST_KEY = 'api-cache-bust-v1';

const broadcastInvalidate = (url) => {
    try {
        localStorage.setItem(CACHE_BUST_KEY, JSON.stringify({ ts: Date.now(), url }));
    } catch (e) {
        // Storage unavailable — other tabs self-heal when their TTL expires.
    }
};

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key !== CACHE_BUST_KEY) return;
        try {
            const marker = JSON.parse(event.newValue || '{}');
            if (marker && typeof marker.url === 'string') invalidateCache(marker.url);
        } catch (e) {
            // Malformed marker — nothing to invalidate.
        }
    });
}

// The interceptor can serve a cache hit by swapping in a custom adapter; the
// response then flows through the response interceptor normally. Payloads are
// cloned on read so a page mutating its data can never corrupt the cache.
const serveFromCache = (payload) => (config) => Promise.resolve({
    data: {
        __apiCached: true,
        payload: typeof structuredClone === 'function' ? structuredClone(payload) : payload,
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
});

api.interceptors.request.use((config) => {
    // J: no Authorization header is attached from JS storage anymore — the
    // HttpOnly auth cookie (sent because withCredentials:true) authenticates the
    // request, so the token is never exposed to JS (XSS hardening). For unsafe
    // methods we attach the CSRF double-submit token read from the readable
    // csrf cookie; the server verifies it matches (see middleware/csrf.js).
    const method = String(config.method || 'get').toLowerCase();
    if (method !== 'get' && method !== 'head') {
        const csrf = readCookie(CSRF_COOKIE);
        if (csrf) config.headers['X-CSRF-Token'] = csrf;
    }
    if (config.data instanceof FormData) {
        if (typeof config.headers.delete === 'function') {
            config.headers.delete('Content-Type');
        } else {
            delete config.headers['Content-Type'];
        }
    }
    hydrateCache();
    if (method !== 'get') {
        invalidateCache(config.url || '');
        broadcastInvalidate(config.url || '');
        return config;
    }
    if (config.cache === false) return config;
    const path = cleanPath(config.url || '');
    if (NO_CACHE_PATHS.some(ep => path === ep || path.startsWith(ep))) return config;
    const key = buildCacheKey(config);
    const now = Date.now();
    const hit = cacheGet(key, now);
    if (hit) {
        config.adapter = serveFromCache(hit);
    } else {
        config.cacheKey = key;
        config.cacheTtl = cacheTtlFor(path);
    }
    return config;
});

// Endpoint unwrap lists and the cleanPath / matchesPath / applyUnwrap helpers
// now live in ./responseUnwrap (pure + unit-tested); imported at the top.

api.interceptors.response.use(
    (response) => {
        try {
            // A cache hit carries the ORIGINAL server envelope (see
            // serveFromCache); a fresh response carries it directly. Either way
            // we unwrap uniformly below, so pagination metadata is reconstructed
            // on every delivery.
            let payload;
            let fromCache = false;
            if (response.data && response.data.__apiCached === true) {
                payload = response.data.payload;
                fromCache = true;
            } else {
                payload = response.data;
            }

            // Cache the RAW envelope (a plain object), NOT the unwrapped array.
            // Non-index properties attached to an array (pagination metadata) are
            // dropped by JSON.stringify when the cache is persisted to
            // sessionStorage, which made page 2+ unreachable after a reload.
            // Storing the envelope keeps the metadata intact.
            const cfg = response.config || {};
            if (!fromCache && cfg.cacheKey && response.status === 200) {
                cacheSet(cfg.cacheKey, payload, cfg.cacheTtl, Date.now());
            }

            const path = cleanPath((response.config && response.config.url) || '');
            response.data = applyUnwrap(payload, path);
        } catch (e) {
            // Silently ignore interceptor errors
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // J: the session is the HttpOnly cookie; USER is just the cached
            // profile. On a 401 drop the cached profile (and any legacy stored
            // token) and bounce to login.
            const wasLoggedIn = localStorage.getItem('USER');
            localStorage.removeItem('USER');
            localStorage.removeItem('ACCESS_TOKEN');
            if (wasLoggedIn && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
