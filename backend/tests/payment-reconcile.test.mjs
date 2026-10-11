import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import NotificationService from '../services/NotificationService.js';
import { decideStalePending, reconcileStalePendingForMonths, STALE_PENDING_MINUTES } from '../controllers/Student/SslCommerzController.js';

// Phase 2b — C6 stale-pending reconciliation (validate-before-reclaim, double-
// charge-safe). No real DB/gateway: models + the gateway validator are stubbed.

const orig = { pFindAll: models.Payment.findAll, pDestroy: models.Payment.destroy, sFindByPk: models.Student.findByPk, notify: NotificationService.create };
afterEach(() => {
  models.Payment.findAll = orig.pFindAll;
  models.Payment.destroy = orig.pDestroy;
  models.Student.findByPk = orig.sFindByPk;
  NotificationService.create = orig.notify;
});
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const STALE = STALE_PENDING_MINUTES + 10; // minutes old = definitely stale

// --- pure decision ---------------------------------------------------------
test('decideStalePending: a NOT-yet-stale pending is kept (live payment)', () => {
  assert.equal(decideStalePending({ ageMinutes: 1, staleMinutes: 30, gateway: { status: 'FAILED' }, expectedTotal: 100 }), 'keep');
});
test('decideStalePending: stale + gateway unreachable ⇒ keep (fail-safe, no double charge)', () => {
  assert.equal(decideStalePending({ ageMinutes: 99, staleMinutes: 30, gateway: null, expectedTotal: 100 }), 'keep');
});
test('decideStalePending: stale + gateway VALID + amount matches ⇒ settle', () => {
  assert.equal(decideStalePending({ ageMinutes: 99, staleMinutes: 30, gateway: { status: 'VALID', amount: 100 }, expectedTotal: 100 }), 'settle');
});
test('decideStalePending: stale + VALID but amount MISMATCH ⇒ keep (anomaly, manual review)', () => {
  assert.equal(decideStalePending({ ageMinutes: 99, staleMinutes: 30, gateway: { status: 'VALID', amount: 999 }, expectedTotal: 100 }), 'keep');
});
test('decideStalePending: stale + gateway non-paid (FAILED/EXPIRED) ⇒ reclaim', () => {
  assert.equal(decideStalePending({ ageMinutes: 99, staleMinutes: 30, gateway: { status: 'FAILED' }, expectedTotal: 100 }), 'reclaim');
  assert.equal(decideStalePending({ ageMinutes: 99, staleMinutes: 30, gateway: { status: 'EXPIRED' }, expectedTotal: 100 }), 'reclaim');
});

// --- orchestration ---------------------------------------------------------
const now = Date.now();
const makePending = (over = {}) => ({ id: 1, student_id: 1, month: 'Aug 2026', amount: '1000.00', trx_id: 'T1', status: 'pending', ssl_val_id: null, createdAt: new Date(now - STALE * 60000), _saved: false, async save() { this._saved = true; } });

test('reconcile SETTLE: gateway says the stale pending was actually paid → mark paid, never recharge', async () => {
  const row = makePending();
  models.Payment.findAll = async () => [row];
  models.Student.findByPk = async () => ({ user_id: 5 });
  NotificationService.create = async () => ({});
  let destroyed = false;
  models.Payment.destroy = async () => { destroyed = true; return 1; };

  await reconcileStalePendingForMonths({ config: {}, studentId: 1, months: ['Aug 2026'], now, validate: async () => ({ status: 'VALID', amount: 1000, valId: 'V1' }) });

  assert.equal(row.status, 'paid');
  assert.equal(row._saved, true);
  assert.equal(row.ssl_val_id, 'V1');
  assert.equal(destroyed, false, 'settled payment is NEVER deleted (no double charge)');
});

test('reconcile RECLAIM: gateway says not paid → the stale pending is released for retry', async () => {
  const row = makePending();
  models.Payment.findAll = async () => [row];
  let destroyWhere = null;
  models.Payment.destroy = async (opts) => { destroyWhere = opts.where; return 1; };

  await reconcileStalePendingForMonths({ config: {}, studentId: 1, months: ['Aug 2026'], now, validate: async () => ({ status: 'FAILED' }) });

  assert.equal(row.status, 'pending'); // not settled
  assert.ok(destroyWhere && destroyWhere.trx_id === 'T1' && destroyWhere.status === 'pending');
});

test('reconcile KEEP (live): a recent pending is left untouched and the gateway is not even queried', async () => {
  const row = makePending({ });
  row.createdAt = new Date(now - 60000); // 1 min old
  models.Payment.findAll = async () => [row];
  let destroyed = false, validated = false;
  models.Payment.destroy = async () => { destroyed = true; return 1; };

  await reconcileStalePendingForMonths({ config: {}, studentId: 1, months: ['Aug 2026'], now, validate: async () => { validated = true; return { status: 'FAILED' }; } });

  assert.equal(row._saved, false);
  assert.equal(destroyed, false);
  assert.equal(validated, false, 'a live payment must not be reconciled');
});

test('reconcile KEEP (gateway down): a stale pending is NOT reclaimed when validation is unavailable', async () => {
  const row = makePending();
  models.Payment.findAll = async () => [row];
  let destroyed = false;
  models.Payment.destroy = async () => { destroyed = true; return 1; };

  await reconcileStalePendingForMonths({ config: {}, studentId: 1, months: ['Aug 2026'], now, validate: async () => null });

  assert.equal(destroyed, false, 'no gateway confirmation ⇒ never delete (double-charge-safe)');
  assert.equal(row.status, 'pending');
});

test('reconcile no-op when there are no pending rows', async () => {
  models.Payment.findAll = async () => [];
  let touched = false;
  models.Payment.destroy = async () => { touched = true; return 0; };
  await reconcileStalePendingForMonths({ config: {}, studentId: 1, months: ['Aug 2026'], now, validate: async () => { touched = true; return null; } });
  assert.equal(touched, false);
});
