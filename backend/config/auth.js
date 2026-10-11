import dotenv from 'dotenv';
dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required — set a strong random value (e.g. `node -e "console.log(require(\"crypto\").randomBytes(48).toString(\"hex\"))"`) before starting the server');
}

const DEFAULT_EXPIRES = '30d';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES;

// D19: derive the cookie maxAge from the SAME JWT_EXPIRES_IN value so the
// cookie and the token can never expire at different times. Accepts a bare
// seconds number (jsonwebtoken semantics) or a `<n><unit>` string
// (ms/s/m/h/d/w/y); falls back to 30 days on anything unparseable.
export function expiresInToMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value * 1000;
  const m = /^\s*(\d+)\s*(ms|s|m|h|d|w|y)?\s*$/i.exec(String(value == null ? '' : value));
  if (!m) return 30 * 24 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const mult = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000, y: 31536000000 };
  return n * (mult[(m[2] || 's').toLowerCase()] || 1000);
}

export default {
  jwtSecret,
  jwtExpiresIn,
  jwtAlgorithm: 'HS256',
  // Centralised password policy (used by password-change flows).
  // maxLength is bounded by bcrypt's 72-byte input limit.
  passwordPolicy: {
    minLength: 8,
    maxLength: 72,
  },
  // HttpOnly cookie support. The access token is ALSO set as a HttpOnly cookie
  // so browser JS cannot read it (XSS hardening). Secure is on in production
  // (HTTPS) only; SameSite=lax still allows top-level GET navigation for shared
  // document links while blocking cross-site XHR. maxAge is DERIVED from
  // jwtExpiresIn (D19) so cookie and token expiry stay in lockstep.
  cookieName: process.env.COOKIE_NAME || 'uttoron_auth',
  cookie: {
    httpOnly: true,
    secure: process.env.APP_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: expiresInToMs(jwtExpiresIn),
    path: '/',
  },
};

