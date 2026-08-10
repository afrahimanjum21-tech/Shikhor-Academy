import authConfig from '../config/auth.js';

// Read a named cookie from the raw `Cookie` header without `cookie-parser`.
function getCookie(req, name) {
  const header = req && req.headers ? req.headers.cookie : null;
  if (!header) return null;
  const match = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.indexOf(`${name}=`) === 0);
  if (!match) return null;
  try {
    return decodeURIComponent(match.substring(name.length + 1));
  } catch {
    return null;
  }
}

// Bearer `Authorization: Bearer <token>` header takes priority (backward
// compatible with API/legacy clients); the HttpOnly cookie is the browser
// fallback. Returns the raw token string or null.
export function getTokenFromReq(req) {
  if (req && req.headers && typeof req.headers.authorization === 'string' &&
      req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return getCookie(req, authConfig.cookieName);
}

export function setAuthCookie(res, token) {
  if (typeof res.cookie === 'function') {
    res.cookie(authConfig.cookieName, token, authConfig.cookie);
  }
}

export function clearAuthCookie(res) {
  if (typeof res.clearCookie === 'function') {
    res.clearCookie(authConfig.cookieName, { ...authConfig.cookie, maxAge: 0 });
  }
}
