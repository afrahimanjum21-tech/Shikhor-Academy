import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import { store } from '../controllers/Admin/AdminUserController.js';

// C9 — a case-variant email collision at admin student creation must return a
// clear 409 (never a raw 500, never a silent merge). The collision pre-check
// runs before the transaction, so only User.findOne needs stubbing.

const orig = models.User.findOne;
afterEach(() => { models.User.findOne = orig; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('store returns 409 when the (case-variant) email already belongs to an account', async () => {
  let created = false;
  models.User.findOne = async () => ({ id: 2, email: 'dup@x.com' });
  models.User.create = async () => { created = true; return {}; };
  const res = makeRes();
  await store({ body: { name: 'N', email: 'DUP@x.com', password: 'pw12345678' }, file: null }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(created, false, 'no account created on collision');
});
