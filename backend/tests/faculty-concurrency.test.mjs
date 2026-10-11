import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import * as Faculty from '../controllers/Public/FacultyController.js';

/**
 * Regression tests for the Public Faculty controller shared-state concurrency
 * bug: a module-level Sequelize `include` object was mutated per request, so a
 * subject filter (or the ORM's in-place normalization) from one request could
 * leak into another.
 *
 * These run WITHOUT a database: we stub the Sequelize model query methods to
 * capture the options each handler builds, then assert request isolation. No
 * network/DB connection is ever made.
 */

const originals = {
  findAndCountAll: models.Faculty.findAndCountAll,
  findAll: models.Faculty.findAll,
  findOne: models.Faculty.findOne,
};

let captures = [];
function installStubs(rows = []) {
  captures = [];
  models.Faculty.findAndCountAll = async (options) => { captures.push(options); return { count: rows.length, rows }; };
  models.Faculty.findAll = async (options) => { captures.push(options); return rows; };
  models.Faculty.findOne = async (options) => { captures.push(options); return rows[0] || null; };
}
function restoreStubs() { Object.assign(models.Faculty, originals); }

function makeRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

// Locate the Subject include by its association alias (position-independent).
const subjectInclude = (options) => options.include.find((i) => i && i.as === 'subjects');
const subjectWhere = (options) => { const s = subjectInclude(options); return s ? s.where : undefined; };

afterEach(() => restoreStubs());
after(async () => { try { await sequelize.close(); } catch { /* no connection was opened */ } });

test('subject_id filters only the requesting call; no leak across sequential requests in any order', async () => {
  installStubs();
  await Faculty.featured({ query: {} }, makeRes());                               // 0: no filter
  await Faculty.index({ query: { subject_id: 'SUBJ-A' } }, makeRes());            // 1: filter A
  await Faculty.index({ query: {} }, makeRes());                                  // 2: must be clean
  await Faculty.search({ query: { subject_id: 'SUBJ-B', q: 'khan' } }, makeRes()); // 3: filter B
  await Faculty.index({ query: {} }, makeRes());                                  // 4: must be clean

  assert.equal(subjectWhere(captures[0]), undefined, 'featured must carry no subject filter');
  assert.deepEqual(subjectWhere(captures[1]), { id: 'SUBJ-A' }, 'filtered index carries its own filter');
  assert.equal(subjectWhere(captures[2]), undefined, 'unfiltered index must NOT inherit SUBJ-A');
  assert.deepEqual(subjectWhere(captures[3]), { id: 'SUBJ-B' }, 'search carries its own filter');
  assert.equal(subjectWhere(captures[4]), undefined, 'unfiltered index after a filtered search stays clean');
});

test('concurrent requests with different subject filters stay isolated', async () => {
  installStubs();
  await Promise.all([
    Faculty.index({ query: { subject_id: 'X' } }, makeRes()),
    Faculty.index({ query: { subject_id: 'Y' } }, makeRes()),
    Faculty.index({ query: {} }, makeRes()),
    Faculty.search({ query: { subject_id: 'Z' } }, makeRes()),
    Faculty.featured({ query: {} }, makeRes()),
  ]);

  const wheres = captures.map(subjectWhere);
  const nulls = wheres.filter((w) => w === undefined).length;
  const ids = wheres.filter(Boolean).map((w) => w.id).sort();
  assert.equal(nulls, 2, 'the plain index + featured requests carry no filter');
  assert.deepEqual(ids, ['X', 'Y', 'Z'], 'each filtered request keeps exactly its own id');

  const subjectObjs = captures.map(subjectInclude);
  assert.equal(new Set(subjectObjs).size, subjectObjs.length, 'Subject include objects must not be shared references');
});

test('ORM-style in-place mutation of one request cannot bleed into another', async () => {
  installStubs();
  await Faculty.index({ query: { subject_id: 'A' } }, makeRes());
  const first = captures[captures.length - 1];

  // Simulate Sequelize mutating the include objects in place during a query.
  subjectInclude(first).where = { id: 'MUTATED' };
  first.include[0].attributes = ['__leak__'];
  first.include.push({ model: models.User, as: '__injected__' });

  await Faculty.index({ query: {} }, makeRes());
  const second = captures[captures.length - 1];

  assert.equal(subjectWhere(second), undefined, 'no subject filter leaked from the mutated request');
  assert.ok(!second.include.some((i) => i && i.as === '__injected__'), 'no injected include element leaked');
  assert.ok(!(second.include[0].attributes || []).includes('__leak__'), 'nested objects are not shared');
});

test('show() builds fresh detail includes (gallery + user) that are not shared between calls', async () => {
  installStubs([{ toJSON: () => ({ id: 1, slug: 's' }) }]);
  await Faculty.show({ params: { slug: 's' }, query: {} }, makeRes());
  const a = captures[captures.length - 1];
  await Faculty.show({ params: { slug: 's' }, query: {} }, makeRes());
  const b = captures[captures.length - 1];

  assert.deepEqual(
    a.include.map((i) => i.as).sort(),
    ['batches', 'category', 'department', 'galleries', 'subjects', 'user'],
    'detail view keeps all six associations',
  );
  assert.notEqual(a.include, b.include, 'each show() builds its own include array');
  for (let i = 0; i < a.include.length; i++) {
    assert.notEqual(a.include[i], b.include[i], 'include element objects are not shared between calls');
  }
});

test('response shape, pagination, soft-delete filter and batch serialization preserved', async () => {
  installStubs([
    { toJSON: () => ({ id: 1, full_name: 'A', batches: [{ id: 9, FacultyBatch: { subject: 'Math' } }] }) },
  ]);

  const res = makeRes();
  await Faculty.index({ query: { page: 2, limit: 5, department: 'd1', category: 'c1', subject_id: 'S' } }, res);
  const opts = captures[captures.length - 1];

  assert.equal(opts.where.is_active, true);
  assert.equal(opts.where.public_profile_enabled, true);
  assert.equal(opts.where.department_id, 'd1');
  assert.equal(opts.where.faculty_category_id, 'c1');
  assert.equal(opts.distinct, true);
  assert.deepEqual(opts.order, [['display_order', 'ASC'], ['full_name', 'ASC']]);
  assert.equal(opts.limit, 5);
  assert.equal(opts.offset, 5);
  assert.deepEqual(subjectWhere(opts), { id: 'S' });

  assert.deepEqual(Object.keys(res.body), ['data', 'current_page', 'last_page', 'total', 'per_page']);
  assert.equal(res.body.current_page, 2);
  assert.equal(res.body.per_page, 5);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.last_page, 1);
  assert.equal(res.body.data[0].batches[0].subject, 'Math');
  assert.ok(!('FacultyBatch' in res.body.data[0].batches[0]));
});
