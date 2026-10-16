import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import models, { sequelize } from '../models/index.js';
import { index } from '../controllers/Admin/AdminUserController.js';

/**
 * Backend regression tests for Admin Student listing pagination
 * (GET /api/admin/students). The model layer is stubbed, so NO database
 * connection is made. Confirms the controller returns a correct pagination
 * envelope and clamps invalid page/limit values.
 */

const original = models.User.findAndCountAll;
let captured;

function stub(count, rowsN) {
  captured = null;
  models.User.findAndCountAll = async (options) => {
    captured = options;
    const rows = Array.from({ length: rowsN }, (_, i) => ({ toJSON: () => ({ id: i + 1, name: `S${i + 1}` }) }));
    return { rows, count };
  };
}

function makeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(c) { this.statusCode = c; return this; },
    json(p) { this.body = p; return this; },
  };
}

afterEach(() => { models.User.findAndCountAll = original; });
after(async () => { try { await sequelize.close(); } catch { /* no connection opened */ } });

test('dataset larger than one page -> correct offset/last_page/total and preserved filters', async () => {
  stub(57, 20);
  const res = makeRes();
  await index({ query: { page: '1', limit: '20' } }, res);

  assert.equal(captured.offset, 0);
  assert.equal(captured.limit, 20);
  assert.equal(captured.distinct, true);                 // de-dupes rows across the include join
  assert.equal(captured.where.role, 'student');          // role filter preserved
  assert.equal(captured.where.deletedAt, undefined);
  assert.deepEqual(captured.order, [['createdAt', 'DESC']]);

  assert.equal(res.body.total, 57);
  assert.equal(res.body.last_page, 3);
  assert.equal(res.body.current_page, 1);
  assert.equal(res.body.per_page, 20);
  assert.equal(res.body.data.length, 20);
});

test('final page -> correct offset', async () => {
  stub(57, 17);
  const res = makeRes();
  await index({ query: { page: '3', limit: '20' } }, res);
  assert.equal(captured.offset, 40);
  assert.equal(res.body.current_page, 3);
  assert.equal(res.body.last_page, 3);
  assert.equal(res.body.data.length, 17);
});

test('empty result set -> total 0, last_page 0, empty data', async () => {
  stub(0, 0);
  const res = makeRes();
  await index({ query: {} }, res);
  assert.equal(res.body.total, 0);
  assert.equal(res.body.last_page, 0);
  assert.deepEqual(res.body.data, []);
});

test('search filter -> whereClause includes a 4-field OR (name/email/phone/id)', async () => {
  stub(2, 2);
  const res = makeRes();
  await index({ query: { search: 'khan' } }, res);
  const or = captured.where[Op.or];
  assert.ok(Array.isArray(or) && or.length === 4, 'search builds a 4-field OR');
  assert.equal(res.body.total, 2);
});

test('invalid page numbers are clamped to >= 1 (never a negative offset)', async () => {
  for (const bad of ['0', '-5', 'abc', '', undefined]) {
    stub(57, 20);
    const res = makeRes();
    await index({ query: { page: bad, limit: '20' } }, res);
    assert.ok(captured.offset >= 0, `offset must be >= 0 for page=${JSON.stringify(bad)} (got ${captured.offset})`);
    assert.equal(res.body.current_page, 1, `page=${JSON.stringify(bad)} must clamp to 1`);
  }
});

test('invalid limit is clamped to >= 1', async () => {
  stub(5, 5);
  const res = makeRes();
  await index({ query: { page: '1', limit: '-10' } }, res);
  assert.ok(captured.limit >= 1, `limit must be >= 1 (got ${captured.limit})`);
});
