import crypto from 'crypto';
import authConfig from '../config/auth.js';

/**
 * J (H-low11) — CSRF protection for cookie-authenticated requests.
 *
 * The JWT now lives ONLY in a HttpOnly cookie (the frontend no longer keeps it
 * in localStorage), so the browser attaches it automatically. That reintroduces
 * CSRF risk for state-changing requests, so we add a double-submit token:
 *
 *   - A readable (non-HttpOnly) `uttoron_csrf` cookie is issued to every client.
 *   - For unsafe methods the client must echo it back in an `X-CSRF-Token`
 *     header. A cross-site page can neither read the victim's cookie
 *     (same-origin policy) nor set a custom header on a cross-origin request
 *     without a CORS pre-flight the server won't grant — so it cannot forge the
 *     pair.
 *
 * Scope: the check applies ONLY to requests that carry the session cookie and
 * no explicit Bearer header. That cleanly exempts:
 *   - safe methods (GET/HEAD/OPTIONS),
 *   - API clients using `Authorization: Bearer …` (not a CSRF vector),
 *   - unauthenticated public posts (login, admission submit, contact) and
 *     server-to-server callbacks (e.g. the payment gateway IPN) which have no
 *     ambient session cookie and therefore nothing to protect.
 *
 * Same-origin deployment (see H-cfg1): the auth cookie is also SameSite=Lax,
 * which already blocks cross-site sub-requests; this token is defence-in-depth.
 */

const CSRF_COOKIE = process.env.CSRF_COOKIE_NAME || 'uttoron_csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Endpoints that are NOT SPA/axios calls (so they cannot attach a header) but
// already carry their own unforgeable, action-bound protection. The admission
// email-action link posts a native HTML form whose body contains a signed,
// action-bound, 72h-expiry JWT (SEC-2) — that token IS the CSRF defense, so the
// double-submit header check is skipped for it. Matched by suffix so it holds
// regardless of the `/api` mount.
function isExemptPath(req) {
  const p = req && req.path ? req.path : '';
  return p.endsWith('/public/admissions/action');
}

// Read a single cookie from the raw header (no cookie-parser dependency).
function readRawCookie(req, name) {
  const header = req && req.headers ? req.headers.cookie : null;
  if (!header) return null;
  const hit = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.indexOf(`${name}=`) === 0);
  if (!hit) return null;
  try {
    return decodeURIComponent(hit.substring(name.length + 1));
  } catch {
    return null;
  }
}

function timingSafeEqualStr(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function csrfProtection(req, res, next) {
  // Make sure the browser always has a token it can echo back. Issued as a
  // readable cookie (the SPA must read it); mirrors the auth cookie's Secure/
  // maxAge so both expire together.
  let csrfToken = readRawCookie(req, CSRF_COOKIE);
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(32).toString('hex');
    if (typeof res.cookie === 'function') {
      res.cookie(CSRF_COOKIE, csrfToken, {
        httpOnly: false,
        secure: authConfig.cookie.secure,
        sameSite: 'lax',
        path: '/',
        maxAge: authConfig.cookie.maxAge,
      });
    }
  }

  if (SAFE_METHODS.has(req.method)) return next();

  // Endpoints with their own unforgeable token protection (native form posts).
  if (isExemptPath(req)) return next();

  // API clients using an explicit Bearer header are not CSRF-prone.
  const hasBearer = typeof req.headers.authorization === 'string' &&
    req.headers.authorization.startsWith('Bearer ');
  if (hasBearer) return next();

  // Only cookie-authenticated browser requests need the double-submit check.
  // No session cookie ⇒ public/unauthenticated/callback ⇒ nothing to protect.
  const hasAuthCookie = !!readRawCookie(req, authConfig.cookieName);
  if (!hasAuthCookie) return next();

  const headerToken = req.headers[CSRF_HEADER];
  if (!csrfToken || !headerToken || !timingSafeEqualStr(headerToken, csrfToken)) {
    return res.status(403).json({ message: 'Invalid or missing CSRF token' });
  }
  return next();
}

export { CSRF_COOKIE, CSRF_HEADER };
