import crypto from 'node:crypto';
import logger from './logger.js';

/**
 * Application-level encryption-at-rest for sensitive credential columns
 * (SEC-6): PaymentSetting.store_password, SiteSetting.smtp_password,
 * SiteSetting.email_api_key.
 *
 * Construction: AES-256-GCM (authenticated encryption, built into Node — no
 * new dependency). Stored envelope is versioned and self-describing:
 *
 *     enc:v1:<base64( iv[12] || tag[16] || ciphertext )>
 *
 * Key: a 32-byte key supplied via env CREDENTIAL_ENCRYPTION_KEY (64 hex chars
 * or base64). Never hardcoded. On Vercel this is a project Environment
 * Variable; locally it lives in backend/.env (see .env.example).
 *
 * Safety properties:
 *  - decryptSecret() is TRANSPARENT: a legacy plaintext value (no `enc:`
 *    prefix) is returned unchanged, so reads keep working before/after backfill.
 *  - encryptSecret() is idempotent (already-encrypted input is returned as-is)
 *    and, when no key is configured, returns the plaintext unchanged + warns —
 *    so admin writes never break; the value is simply not yet encrypted.
 *  - Missing key, wrong key, tampered data, or an unknown version never corrupt
 *    the stored value: decryptSecret() returns null and logs (no secret value),
 *    letting callers fall back to env / disabled behaviour.
 */

const ENC_NS = 'enc:';
const V1_PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

let warnedMissingKey = false;

function getKey() {
  const raw = (process.env.CREDENTIAL_ENCRYPTION_KEY || '').trim();
  if (!raw) return null;
  let key = null;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    try { key = Buffer.from(raw, 'base64'); } catch { key = null; }
  }
  if (!key || key.length !== 32) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      logger.error('secretCrypto', 'CREDENTIAL_ENCRYPTION_KEY is set but is not a 32-byte hex/base64 key');
    }
    return null;
  }
  return key;
}

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_NS);
}

export function encryptSecret(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  if (isEncrypted(plaintext)) return plaintext; // idempotent
  const key = getKey();
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      logger.warn('secretCrypto', 'CREDENTIAL_ENCRYPTION_KEY not configured; storing secret unencrypted');
    }
    return plaintext; // preserve current behaviour until a key is configured
  }
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return V1_PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptSecret(stored) {
  if (stored === null || stored === undefined || stored === '') return stored;
  if (!isEncrypted(stored)) return stored; // legacy plaintext — transparent read
  if (!stored.startsWith(V1_PREFIX)) {
    logger.error('secretCrypto', 'Encrypted secret uses an unsupported version prefix');
    return null; // fail safe — never guess
  }
  const key = getKey();
  if (!key) {
    logger.error('secretCrypto', 'Encrypted secret present but CREDENTIAL_ENCRYPTION_KEY is missing/invalid; cannot decrypt');
    return null; // fail safe — do NOT corrupt the stored ciphertext
  }
  try {
    const buf = Buffer.from(stored.slice(V1_PREFIX.length), 'base64');
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const ct = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    logger.error('secretCrypto', 'Secret decryption failed (tampered ciphertext or wrong key)');
    return null; // fail safe
  }
}

export default { encryptSecret, decryptSecret, isEncrypted };
