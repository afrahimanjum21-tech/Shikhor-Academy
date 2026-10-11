import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import NotificationService from '../services/NotificationService.js';
import { store } from '../controllers/Admin/PaymentController.js';

// C7 — manual payment validation + deliberate 409 on a duplicate-month conflict.

const orig = { sFind: models.Student.findByPk, pCreate: models.Payment.create, notify: NotificationService.create };
afterEach(() => { models.Student.findByPk = orig.sFind; models.Payment.create = orig.pCreate; NotificationService.create = orig.notify; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('rejects a missing amount (400)', async () => {
  const res = makeRes();
  await store({ body: { student_id: 1 } }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects negative / non-finite amounts (400)', async () => {
  let res = makeRes(); await store({ body: { student_id: 1, amount: -5 } }, res); assert.equal(res.statusCode, 400);
  res = makeRes(); await store({ body: { student_id: 1, amount: 'abc' } }, res); assert.equal(res.statusCode, 400);
});

test('404 when the student does not exist', async () => {
  models.Student.findByPk = async () => null;
  const res = makeRes();
  await store({ body: { student_id: 999, amount: 1000 } }, res);
  assert.equal(res.statusCode, 404);
});

test('records a payment with a canonical month and allows a ৳0 waiver', async () => {
  models.Student.findByPk = async () => ({ id: 1, user_id: 5 });
  NotificationService.create = async () => ({});
  let created;
  models.Payment.create = async (v) => { created = v; return { id: 1, ...v }; };
  const res = makeRes();
  await store({ body: { student_id: 1, amount: 0, month: '2026-08', status: 'paid' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(created.month, 'Aug 2026'); // canonicalized
  assert.equal(created.amount, 0);         // waiver preserved
});

test('maps a duplicate-month unique conflict to 409 (not a generic 500)', async () => {
  models.Student.findByPk = async () => ({ id: 1, user_id: 5 });
  models.Payment.create = async () => { const e = new Error('dup'); e.name = 'SequelizeUniqueConstraintError'; throw e; };
  const res = makeRes();
  await store({ body: { student_id: 1, amount: 1000, month: 'Aug 2026' } }, res);
  assert.equal(res.statusCode, 409);
});
