import dotenv from 'dotenv';
dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required — set a strong random value (e.g. `node -e "console.log(require(\"crypto\").randomBytes(48).toString(\"hex\"))"`) before starting the server');
}

export default {
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
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
  // document links while blocking cross-site XHR. maxAge mirrors jwtExpiresIn.
  cookieName: process.env.COOKIE_NAME || 'uttoron_auth',
  cookie: {
    httpOnly: true,
    secure: process.env.APP_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  },
};
