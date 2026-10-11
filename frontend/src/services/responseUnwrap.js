/**
 * Pure, dependency-free response-unwrap logic used by the axios interceptor in
 * api.js. It lives in its own module (no axios / browser imports) so it can be
 * unit-tested in isolation — see responseUnwrap.test.mjs.
 *
 * Why this exists: the API wraps list payloads as { data: [...], total,
 * current_page, last_page, per_page }. Pages consume the unwrapped array but
 * still read pagination metadata off it. Because the client GET cache persists
 * to sessionStorage via JSON.stringify — which drops non-index properties
 * attached to an array — the cache must store the RAW envelope (a plain
 * object, JSON-safe) and the metadata must be re-attached on every delivery.
 * `applyUnwrap` does that reconstruction, so it is called for both fresh and
 * cached responses in api.js.
 */

// Endpoints whose ARRAY payload { data: [...] } should be unwrapped to the array.
export const UNWRAP_ENDPOINTS = [
    '/admin/students',
    '/admin/teachers',
    '/admin/batches',
    '/admin/course-categories',
    '/admin/events',
    '/public/notices',
    '/public/teachers',
    '/public/gallery',
    '/public/materials',
    '/public/courses',
    '/public/course-categories',
    '/public/faculty',
    '/admin/admissions',
    '/admin/faculty',
    '/admin/faculty/',
    '/admin/e-learning',
    '/admin/exams',
    '/admin/courses',
    '/admin/attendance/leave-requests',
    '/admin/routines',
    '/admin/gallery',
    '/admin/student/',
    '/admin/success-stories',
    '/public/success-stories',
    '/admin/notices',
];

// Endpoints that ALWAYS wrap their payload in { data: ... } (array or object).
// These must be unwrapped so pages receive the payload directly.
export const UNWRAP_ALWAYS_ENDPOINTS = [
    '/admin/faculty/',
    '/student/dashboard',
    '/student/results',
    '/student/attendance/stats',
    '/student/routine',
    '/student/payments',
    '/student/payment/initiate',
    '/student/payment/status',
    '/student/documents',
    '/student/assignments',
    '/student/assignment-results',
    '/public/events',
    '/public/e-learning',
    '/notifications/counts',
    '/notifications/unread-count',
    '/recent-activity',
    '/teacher/dashboard',
    '/teacher/batches',
    '/teacher/students',
    '/teacher/profile',
    '/teacher/attendance/students/',
    '/teacher/exams',
    '/teacher/materials',
    '/teacher/materials/',
    '/teacher/assignments',
    '/teacher/assignments/',
    '/teacher/results/assignments',
    '/teacher/results/exams',
    '/teacher/results/students',
];

// Pagination metadata keys re-attached to unwrapped array payloads.
export const PAGINATION_KEYS = ['total', 'current_page', 'last_page', 'per_page'];

// Strip the query string and any trailing slashes from a URL for matching.
export const cleanPath = (url) => {
    const q = (url || '').indexOf('?');
    return ((q === -1 ? url : url.slice(0, q)) || '').replace(/\/+$/, '');
};

// A pattern ending in '/' matches the exact path and every child route below
// it; any other pattern must equal the whole path. Never a partial-word
// substring match — so '/admin/student/' matches '/admin/student/5/documents'
// but never '/admin/students', and '/admin/faculty/' matches
// '/admin/faculty/subjects' without leaking into unrelated URLs.
export const matchesPath = (path, pattern) => {
    if (pattern.endsWith('/')) return path === pattern || path.startsWith(pattern);
    return path === pattern;
};

/**
 * Given the RAW server envelope and the request path, return what pages should
 * receive: the inner `data` for configured endpoints (with pagination metadata
 * re-attached to array payloads), otherwise the payload unchanged.
 */
export function applyUnwrap(payload, path) {
    const shouldUnwrap =
        payload &&
        payload.data !== undefined &&
        payload.data !== null &&
        (
            UNWRAP_ALWAYS_ENDPOINTS.some((ep) => matchesPath(path, ep)) ||
            (Array.isArray(payload.data) && UNWRAP_ENDPOINTS.some((ep) => matchesPath(path, ep)))
        );

    if (!shouldUnwrap) return payload;

    const data = payload.data;
    if (Array.isArray(data)) {
        // Pages read pagination metadata off the unwrapped list; re-attach it on
        // every delivery so it survives the cache (which stores the envelope).
        for (const key of PAGINATION_KEYS) {
            if (payload[key] !== undefined) data[key] = payload[key];
        }
    }
    return data;
}

// --- GET-cache invalidation (I-10) -----------------------------------------
// A mutation invalidates the subtree of its first two path segments, so
// POST /admin/students clears every cached /admin/students view.

// Namespaces that must ALSO be cleared when the key namespace is mutated — e.g.
// the public notices feed shares rows with the admin list.
export const CROSS_INVALIDATE = {
    '/admin/notices': ['/public/notices'],
    '/admin/success-stories': ['/public/success-stories'],
    '/admin/materials': ['/public/materials'],
    '/admin/courses': ['/public/courses'],
    '/admin/course-categories': ['/public/course-categories'],
    '/admin/e-learning': ['/public/e-learning'],
    '/admin/gallery': ['/public/gallery'],
};

// The namespace a mutation to `url` invalidates: its first two path segments.
export function invalidationNamespace(url) {
    const path = cleanPath(url);
    const segments = path.split('/').filter(Boolean);
    if (segments.length >= 2) return '/' + segments.slice(0, 2).join('/');
    if (segments.length === 1) return '/' + segments[0];
    return path;
}

// True when a cache key's path belongs to the invalidated namespace (or a
// cross-invalidated one). The key's ?query is stripped first, so PAGINATED
// keys like `/admin/students?page=2` are matched too — the previous
// `startsWith(ns + '/')` check missed them, so page 2+ stayed stale (I-10).
export function keyPathInvalidated(keyPath, ns, extra = []) {
    const p = cleanPath(keyPath);
    const under = (base) => p === base || p.startsWith(base + '/');
    return under(ns) || (extra || []).some(under);
}
