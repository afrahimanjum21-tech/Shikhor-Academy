import test from 'node:test';
import assert from 'node:assert/strict';
import { signDownloadToken, verifyDownloadToken } from '../services/downloadToken.js';

// C25/H-sec4 — short-lived, file-scoped signed download tokens. Pure (crypto only).

const PATH = '/uploads/students/abc.pdf';
const OTHER = '/uploads/students/xyz.pdf';

test('a freshly minted token verifies for its exact path', () => {
  const t = signDownloadToken(PATH);
  const payload = verifyDownloadToken(t, PATH);
  assert.ok(payload);
  assert.equal(payload.p, PATH);
});

test('wrong-file / out-of-scope replay is rejected', () => {
  const t = signDownloadToken(PATH);
  assert.equal(verifyDownloadToken(t, OTHER), null);
});

test('an expired token is rejected', () => {
  const past = Date.now() - 1000;
  const t = signDownloadToken(PATH, { now: past - 60000, ttlMs: 1000 }); // expired well before now
  assert.equal(verifyDownloadToken(t, PATH), null);
  // Also explicit: valid signature but exp in the past
  const t2 = signDownloadToken(PATH, { ttlMs: 60000 });
  assert.ok(verifyDownloadToken(t2, PATH, { now: Date.now() }));
  assert.equal(verifyDownloadToken(t2, PATH, { now: Date.now() + 120000 }), null);
});

test('a tampered payload or signature is rejected', () => {
  const t = signDownloadToken(PATH);
  const [payloadB64, sig] = t.split('.');
  // Tamper signature
  assert.equal(verifyDownloadToken(`${payloadB64}.${sig.slice(0, -2)}xx`, PATH), null);
  // Tamper payload (re-point to another file) while keeping the old signature
  const forged = Buffer.from(JSON.stringify({ p: OTHER, exp: Date.now() + 60000 }))
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(verifyDownloadToken(`${forged}.${sig}`, OTHER), null);
});

test('garbage / empty / a non-token string is rejected (no throw)', () => {
  assert.equal(verifyDownloadToken('', PATH), null);
  assert.equal(verifyDownloadToken(null, PATH), null);
  assert.equal(verifyDownloadToken('not-a-token', PATH), null);
  assert.equal(verifyDownloadToken('a.b.c', PATH), null);
  // A JWT-shaped string must not be accepted as a download token.
  assert.equal(verifyDownloadToken('eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.sig', PATH), null);
});
