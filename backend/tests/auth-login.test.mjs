import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import models, { sequelize } from '../models/index.js';
import { login } from '../controllers/Auth/AuthController.js';

// C9 — login must be case-insensitive (exact match first, then a lower(email)
// fallback). models.User.findOne is stubbed; no DB.

const orig = models.User.findOne;
afterEach(() => { models.User.findOne = orig; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; }, cookie() { return this; } });

test('succeeds via the case-insensitive fallback when the exact-case lookup misses', async () => {
  const password = 'secret-xyz-123';
  const hash = await bcrypt.hash(password, 12);
  let calls = 0;
  models.User.findOne = async () => {
    calls += 1;
    return calls === 1 ? null : { id: 1, role: 'student', email: 'foo@bar.com', is_active: true, token_version: 0, name: 'F', phone: '', password: hash, profile_photo_path: null };
  };
  const res = makeRes();
  await login({ body: { email: 'FOO@BAR.com', password } }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body && res.body.token, 'issues a token');
  assert.ok(calls >= 2, 'tried exact-case then the lower() fallback');
});

test('returns 401 for an unknown email (both lookups miss)', async () => {
  models.User.findOne = async () => null;
  const res = makeRes();
  await login({ body: { email: 'nobody@x.com', password: 'whatever' } }, res);
  assert.equal(res.statusCode, 401);
});

test('returns 401 for a wrong password', async () => {
  const hash = await bcrypt.hash('right-pw', 12);
  models.User.findOne = async () => ({ id: 1, role: 'student', email: 'a@b.com', is_active: true, token_version: 0, password: hash });
  const res = makeRes();
  await login({ body: { email: 'a@b.com', password: 'wrong-pw' } }, res);
  assert.equal(res.statusCode, 401);
});
