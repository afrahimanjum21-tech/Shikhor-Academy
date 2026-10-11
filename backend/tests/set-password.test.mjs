import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import models, { sequelize } from '../models/index.js';
import { setPassword } from '../controllers/Auth/AuthController.js';
import { signSetupToken } from '../services/passwordSetupToken.js';
import { createRateLimitStore, rateLimitStoreEnabled } from '../services/rateLimitStore.js';
import { toSafeApprovedUser } from '../controllers/Admin/AdmissionManagerController.js';

// Phase 9 (model-batch): E5 set-password controller, NEW-001 user sanitization,
// C24 rate-limit store factory + fail-open.

const orig = { findByPk: models.User.findByPk };
afterEach(() => { models.User.findByPk = orig.findByPk; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('E5 setPassword: a valid one-time token sets the password + bumps token_version', async () => {
  const INITIAL = await bcrypt.hash('placeholder-unknown-secret', 12);
  const account = { id: 55, password: INITIAL, is_active: true, token_version: 2, _saved: false, async save() { this._saved = true; } };
  models.User.findByPk = async (id) => (Number(id) === 55 ? account : null);

  const token = signSetupToken({ userId: 55, passwordHash: INITIAL });
  const res = makeRes();
  await setPassword({ body: { token, password: 'myNewStrongPass1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(account._saved, true);
  assert.notEqual(account.password, INITIAL, 'password rehashed');
  assert.equal(await bcrypt.compare('myNewStrongPass1', account.password), true);
  assert.equal(account.token_version, 3, 'sessions revoked via token_version bump');
});

test('E5 setPassword: the same token cannot be replayed (hash changed → invalid)', async () => {
  const INITIAL = await bcrypt.hash('placeholder', 12);
  const account = { id: 7, password: INITIAL, is_active: true, token_version: 0, async save() {} };
  models.User.findByPk = async () => account;
  const token = signSetupToken({ userId: 7, passwordHash: INITIAL });

  const res1 = makeRes();
  await setPassword({ body: { token, password: 'firstPassword9' } }, res1);
  assert.equal(res1.statusCode, 200);

  // account.password is now the NEW hash; replaying the old token must fail.
  const res2 = makeRes();
  await setPassword({ body: { token, password: 'secondPassword9' } }, res2);
  assert.equal(res2.statusCode, 400);
});

test('E5 setPassword: missing token / weak password / unknown user all 400', async () => {
  models.User.findByPk = async () => null;
  const r1 = makeRes(); await setPassword({ body: {} }, r1); assert.equal(r1.statusCode, 400);
  const r2 = makeRes(); await setPassword({ body: { token: 'x.y', password: 'short' } }, r2); assert.equal(r2.statusCode, 400);
  const token = signSetupToken({ userId: 999, passwordHash: 'h' });
  const r3 = makeRes(); await setPassword({ body: { token, password: 'longEnoughPass1' } }, r3); assert.equal(r3.statusCode, 400);
});

test('NEW-001 toSafeApprovedUser strips password + token_version', () => {
  const safe = toSafeApprovedUser({ id: 1, name: 'A', email: 'a@b.c', role: 'student', phone: '0', password: '$2a$...', token_version: 5 });
  assert.deepEqual(Object.keys(safe).sort(), ['email', 'id', 'name', 'phone', 'role']);
  assert.equal('password' in safe, false);
  assert.equal('token_version' in safe, false);
  assert.equal(toSafeApprovedUser(null), null);
});

test('C24 rate-limit store: disabled by default, enabled via env', async () => {
  const prev = process.env.RATE_LIMIT_STORE;
  delete process.env.RATE_LIMIT_STORE;
  assert.equal(rateLimitStoreEnabled(), false);
  assert.equal(createRateLimitStore('x'), undefined);

  process.env.RATE_LIMIT_STORE = 'postgres';
  assert.equal(rateLimitStoreEnabled(), true);
  const store = createRateLimitStore('login');
  assert.ok(store && typeof store.increment === 'function');

  // No reachable DB in this sandbox → increment must FAIL-OPEN (0 hits).
  const r = await store.increment('1.2.3.4');
  assert.equal(r.totalHits, 0);
  assert.ok(r.resetTime instanceof Date);

  if (prev === undefined) delete process.env.RATE_LIMIT_STORE; else process.env.RATE_LIMIT_STORE = prev;
});
