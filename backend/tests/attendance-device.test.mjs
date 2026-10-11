import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import { ingest, enroll } from '../controllers/Integration/AttendanceDeviceController.js';

// Biometric attendance ingestion controller — dedupe, mapping, enroll. Models
// stubbed (no DB). Dhaka = UTC+6, so 03:00Z = 09:00 local.

const orig = {
  punchCreate: models.AttendancePunch.create,
  studentFindOne: models.Student.findOne,
  studentFindByPk: models.Student.findByPk,
  batchFindByPk: models.Batch.findByPk,
  attnFindOne: models.Attendance.findOne,
  attnCreate: models.Attendance.create,
};
afterEach(() => { Object.assign(models.AttendancePunch, { create: orig.punchCreate }); models.Student.findOne = orig.studentFindOne; models.Student.findByPk = orig.studentFindByPk; models.Batch.findByPk = orig.batchFindByPk; models.Attendance.findOne = orig.attnFindOne; models.Attendance.create = orig.attnCreate; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });
const makePunch = (v) => ({ ...v, id: 1, _saved: false, async save() { this._saved = true; } });

test('ingest: a mapped student with a batch creates an Attendance row (present)', async () => {
  let lastPunch;
  models.AttendancePunch.create = async (v) => { lastPunch = makePunch(v); return lastPunch; };
  models.Student.findOne = async () => ({ id: 1, current_batch_id: 5, device_user_id: '42' });
  models.Batch.findByPk = async () => ({ id: 5, course_id: 9 });
  models.Attendance.findOne = async () => null;
  let created;
  models.Attendance.create = async (v) => { created = v; return { id: 100, ...v }; };

  const res = makeRes();
  await ingest({ body: { punches: [{ device_user_id: '42', timestamp: '2026-10-11T03:00:00Z' }] } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.created, 1);
  assert.equal(res.body.data.stored, 1);
  assert.equal(created.status, 'present');
  assert.equal(created.date, '2026-10-11');
  assert.equal(created.session, 'morning');
  assert.equal(lastPunch.status, 'mapped');
  assert.equal(lastPunch.attendance_id, 100);
});

test('ingest: a re-sent punch (unique conflict) is counted as a duplicate, not reprocessed', async () => {
  models.AttendancePunch.create = async () => { const e = new Error('dup'); e.name = 'SequelizeUniqueConstraintError'; throw e; };
  let attnCreated = false;
  models.Attendance.create = async () => { attnCreated = true; return {}; };

  const res = makeRes();
  await ingest({ body: { punches: [{ device_user_id: '42', timestamp: '2026-10-11T03:00:00Z' }] } }, res);

  assert.equal(res.body.data.duplicates, 1);
  assert.equal(attnCreated, false);
});

test('ingest: an unknown device id is stored but marked unmapped (no attendance)', async () => {
  let lastPunch;
  models.AttendancePunch.create = async (v) => { lastPunch = makePunch(v); return lastPunch; };
  models.Student.findOne = async () => null;
  let attnCreated = false;
  models.Attendance.create = async () => { attnCreated = true; return {}; };

  const res = makeRes();
  await ingest({ body: { punches: [{ device_user_id: '999', timestamp: '2026-10-11T03:00:00Z' }] } }, res);

  assert.equal(res.body.data.unmapped, 1);
  assert.equal(lastPunch.status, 'unmapped');
  assert.equal(attnCreated, false);
});

test('ingest: rejects an empty body (400)', async () => {
  const res = makeRes();
  await ingest({ body: {} }, res);
  assert.equal(res.statusCode, 400);
});

test('enroll: maps a student to a device id; 404 unknown, 409 on a taken id, 400 missing', async () => {
  // 400
  let res = makeRes(); await enroll({ body: { student_id: 1 } }, res); assert.equal(res.statusCode, 400);
  // 404
  models.Student.findByPk = async () => null;
  res = makeRes(); await enroll({ body: { student_id: 9, device_user_id: '42' } }, res); assert.equal(res.statusCode, 404);
  // success
  const student = { id: 1, device_user_id: null, async save() { this._saved = true; } };
  models.Student.findByPk = async () => student;
  res = makeRes(); await enroll({ body: { student_id: 1, device_user_id: '42' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(student.device_user_id, '42');
  // 409 (already taken)
  const student2 = { id: 2, device_user_id: null, async save() { const e = new Error('dup'); e.name = 'SequelizeUniqueConstraintError'; throw e; } };
  models.Student.findByPk = async () => student2;
  res = makeRes(); await enroll({ body: { student_id: 2, device_user_id: '42' } }, res);
  assert.equal(res.statusCode, 409);
});
