// Short-lived, file-scoped signed download tokens — the safe replacement for
// putting the long-lived (30-day) session JWT in `?token=` upload URLs.
//
// A token is bound to ONE exact resource path and an expiry, signed with an
// HMAC key DERIVED from JWT_SECRET but namespaced so a download token is
// cryptographically unrelated to an auth JWT (one can never be used as the
// other). It carries no privileges beyond "fetch this one file until it
// expires", so a leaked URL ages out in minutes instead of weeks.
//
// Pure + dependency-free (crypto only) so it unit-tests without HTTP/DB.
import crypto from 'crypto';
import authConfig from '../config/auth.js';

const KEY = crypto
  .createHash('sha256')
  .update(`uttoron:download-token:v1:${authConfig.jwtSecret}`)
  .digest();

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes — short-lived, but long
                                       // enough to view a page and still click
                                       // "download" / lazy-load an image.

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const sign = (payloadB64) => b64url(crypto.createHmac('sha256', KEY).update(payloadB64).digest());

// Mint a token scoped to `resourcePath` (e.g. "/uploads/students/abc.pdf").
export function signDownloadToken(resourcePath, { ttlMs = DEFAULT_TTL_MS, now = Date.now(), sub = null } = {}) {
  if (!resourcePath || typeof resourcePath !== 'string') {
    throw new Error('signDownloadToken: resourcePath is required');
  }
  const payload = { p: resourcePath, exp: now + ttlMs };
  if (sub != null) payload.sub = sub;
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

// Return the payload iff the token is well-formed, untampered, unexpired, and
// scoped to EXACTLY `resourcePath`; otherwise null. Never throws.
export function verifyDownloadToken(token, resourcePath, { now = Date.now() } = {}) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const payloadB64 = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(payloadB64);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== 'number' || payload.exp <= now) return null;
  if (payload.p !== resourcePath) return null; // wrong-file / out-of-scope replay
  return payload;
}

export const DOWNLOAD_TOKEN_TTL_MS = DEFAULT_TTL_MS;
