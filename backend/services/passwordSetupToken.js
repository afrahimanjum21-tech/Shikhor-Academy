import crypto from 'crypto';
import authConfig from '../config/auth.js';

/**
 * E5 — one-time password SETUP / RESET token (no plaintext password in email).
 *
 * Instead of generating a password and emailing it in plaintext (a reusable
 * secret that lingers in the student's inbox and any mail logs), admission
 * approval now emails a short-lived link carrying one of these tokens. The
 * student clicks it and sets their own password.
 *
 * Design — stateless + single-use WITHOUT a new table:
 *   token = base64url("<userId>.<exp>") + "." + base64url(HMAC)
 *   HMAC key = HMAC_SHA256( "<namespace>:<JWT_SECRET>", currentPasswordHash )
 *
 * Binding the signature to the account's CURRENT bcrypt hash makes the link
 * self-invalidating: the moment the student sets a password, the hash changes,
 * so the HMAC no longer matches and the link cannot be replayed. `exp` bounds
 * it in time (default 48h). No DB column, no migration, no stored token.
 *
 * The secret is namespaced from JWT_SECRET so these tokens can never be
 * confused with auth JWTs or signed download tokens.
 */

const NAMESPACE = 'uttoron:pwd-setup:v1';
const DEFAULT_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}
function fromB64url(str) {
  return Buffer.from(String(str), 'base64url');
}

function hmacKey(passwordHash) {
  return crypto
    .createHmac('sha256', `${NAMESPACE}:${authConfig.jwtSecret}`)
    .update(String(passwordHash || ''))
    .digest();
}

function sign(payload, passwordHash) {
  return crypto.createHmac('sha256', hmacKey(passwordHash)).update(payload).digest();
}

export function signSetupToken({ userId, passwordHash, ttlMs = DEFAULT_TTL_MS, now = Date.now() }) {
  const exp = now + ttlMs;
  const payload = `${userId}.${exp}`;
  return `${b64url(payload)}.${b64url(sign(payload, passwordHash))}`;
}

// Parse the userId WITHOUT verifying — the caller needs it to look up the
// account's current password hash before it can verify the signature.
export function decodeUserId(token) {
  try {
    const [pB64] = String(token).split('.');
    if (!pB64) return null;
    const payload = fromB64url(pB64).toString('utf8');
    const [userIdStr] = payload.split('.');
    const userId = Number(userIdStr);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

// Verify signature + expiry against the account's CURRENT password hash.
// Returns { valid, userId? , expired? }.
export function verifySetupToken(token, { passwordHash, now = Date.now() }) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 2) return { valid: false };
    const [pB64, sB64] = parts;
    const payload = fromB64url(pB64).toString('utf8');
    const [userIdStr, expStr] = payload.split('.');
    const userId = Number(userIdStr);
    const exp = Number(expStr);
    if (!Number.isInteger(userId) || userId <= 0 || !Number.isFinite(exp)) return { valid: false };
    if (now > exp) return { valid: false, expired: true };

    const expected = sign(payload, passwordHash);
    const got = fromB64url(sB64);
    if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) {
      return { valid: false };
    }
    return { valid: true, userId };
  } catch {
    return { valid: false };
  }
}

export const SETUP_TOKEN_TTL_MS = DEFAULT_TTL_MS;
