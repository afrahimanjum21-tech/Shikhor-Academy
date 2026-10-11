import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import { store as adminCourseStore } from '../controllers/Admin/CourseController.js';
import { show as publicCourseShow } from '../controllers/Public/CourseController.js';

// D14 — admin course create validates title; D15 — public show scopes to active.

const orig = { courseFindOne: models.Course.findOne, courseFindByPk: models.Course.findByPk };
afterEach(() => { models.Course.findOne = orig.courseFindOne; models.Course.findByPk = orig.courseFindByPk; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('D14: admin course store returns 400 (not a 500) when title is missing', async () => {
  let created = false;
  models.Course.findOne = async () => { created = true; return null; };
  const res = makeRes();
  await adminCourseStore({ body: {}, file: null }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(created, false); // bailed before any slug/DB work
});

test('D15: public course show uses findOne scoped to is_active (never findByPk)', async () => {
  let where = null;
  let findByPkCalled = false;
  models.Course.findOne = async (opts) => { where = opts.where; return null; };
  models.Course.findByPk = async () => { findByPkCalled = true; return { id: 1 }; };

  const res = makeRes();
  await publicCourseShow({ params: { id: 7 } }, res);

  assert.equal(findByPkCalled, false, 'must not use findByPk (which ignores the where filter)');
  assert.equal(where.is_active, true, 'the active filter is actually applied');
  assert.equal(where.id, 7);
  assert.equal(res.statusCode, 404); // inactive/absent => not found
});
