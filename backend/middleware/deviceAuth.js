import crypto from 'crypto';

/**
 * Device/agent authentication for the biometric attendance ingestion API.
 *
 * A fingerprint machine (or the small local "bridge" agent that reads it and
 * forwards punches) is NOT a logged-in user, so it cannot use the session
 * cookie/JWT. It authenticates with a shared secret sent in the `X-Device-Key`
 * header, checked against ATTENDANCE_DEVICE_KEY (one key, or several
 * comma-separated so each site/device can have its own).
 *
 * SECURITY: if no key is configured the endpoint is DISABLED (503). This means
 * the attendance-write endpoint is NEVER open/unauthenticated by default — it
 * only turns on once the operator sets a strong ATTENDANCE_DEVICE_KEY.
 */
function configuredKeys() {
  return String(process.env.ATTENDANCE_DEVICE_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

function matchesAnyKey(keys, provided) {
  const p = Buffer.from(String(provided));
  let ok = false;
  for (const k of keys) {
    const kb = Buffer.from(k);
    // Only equal-length buffers can be timing-safe compared; check every key
    // (no early return) so timing doesn't leak which/whether a key matched.
    if (kb.length === p.length && crypto.timingSafeEqual(kb, p)) ok = true;
  }
  return ok;
}

export function deviceAuth(req, res, next) {
  const keys = configuredKeys();
  if (!keys.length) {
    return res.status(503).json({ message: 'Attendance device ingestion is not configured' });
  }
  const provided = req.headers['x-device-key'];
  if (!provided || !matchesAnyKey(keys, provided)) {
    return res.status(401).json({ message: 'Invalid device key' });
  }
  return next();
}

export { configuredKeys };
