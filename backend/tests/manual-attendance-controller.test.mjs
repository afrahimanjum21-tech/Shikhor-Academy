import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import { manualSheet, manualSave } from '../controllers/Teacher/TeacherAttendanceController.js';
import { manualSave as adminManualSave } from '../controllers/Admin/AttendanceController.js';

const originals = {
  assignmentFindOne: models.TeacherBatchAssignment.findOne,
  batchFindByPk: models.Batch.findByPk,
  studentFindOne: models.Student.findOne,
  attendanceFindOne: models.Attendance.findOne,
  attendanceCreate: models.Attendance.create,
};

afterEach(() => {
  models.TeacherBatchAssignment.findOne = originals.assignmentFindOne;
  models.Batch.findByPk = originals.batchFindByPk;
  models.Student.findOne = originals.studentFindOne;
  models.Attendance.findOne = originals.attendanceFindOne;
  models.Attendance.create = originals.attendanceCreate;
});

after(async () => {
  try { await sequelize.close(); } catch { /* no DB connection was opened */ }
});

const makeRes = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

test('teacher manual endpoints reject a non-integer batch id before any database lookup', async () => {
  models.TeacherBatchAssignment.findOne = async () => { throw new Error('must not query assignment'); };

  const sheetRes = makeRes();
  await manualSheet({ user: { id: 55 }, query: { batch_id: 'abc', date: '2026-10-23', session: 'morning' } }, sheetRes);
  assert.equal(sheetRes.statusCode, 400);
  assert.match(sheetRes.body.message, /valid batch/);

  const saveRes = makeRes();
  await manualSave({
    user: { id: 55 },
    body: { student_id: 100, batch_id: 'abc', date: '2026-10-23', session: 'morning', status: 'present' },
  }, saveRes);
  assert.equal(saveRes.statusCode, 400);
  assert.match(saveRes.body.message, /valid batch/);
});

test('teacher cannot read or modify attendance for a batch they are not assigned to', async () => {
  models.TeacherBatchAssignment.findOne = async () => null;
  models.Attendance.findOne = async () => { throw new Error('must not query attendance'); };
  models.Attendance.create = async () => { throw new Error('must not write attendance'); };

  const sheetRes = makeRes();
  await manualSheet({ user: { id: 55 }, query: { batch_id: 1, date: '2026-10-23', session: 'morning' } }, sheetRes);
  assert.equal(sheetRes.statusCode, 403);

  const saveRes = makeRes();
  await manualSave({
    user: { id: 55 },
    body: { student_id: 100, batch_id: 1, date: '2026-10-23', session: 'morning', status: 'present' },
  }, saveRes);
  assert.equal(saveRes.statusCode, 403);
});

test('a database failure returns a failure response and never exposes a WhatsApp URL', async () => {
  models.TeacherBatchAssignment.findOne = async () => ({ id: 1 });
  models.Batch.findByPk = async () => ({
    id: 1,
    name: 'Batch A',
    course_id: 10,
    Course: { id: 10, title: 'Class 9' },
  });
  models.Student.findOne = async () => ({
    id: 100,
    user_id: 5,
    student_id_card_no: 'ST-100',
    guardian_phone: '01712345678',
    father_phone: null,
    mother_phone: null,
    User: { id: 5, name: 'Ayesha Rahman' },
  });
  models.Attendance.findOne = async () => null;
  models.Attendance.create = async () => { throw new Error('database unavailable'); };

  const originalError = console.error;
  console.error = () => {};
  const res = makeRes();
  try {
    await manualSave({
      user: { id: 55 },
      body: { student_id: 100, batch_id: 1, date: '2026-10-23', session: 'morning', status: 'present' },
    }, res);
  } finally {
    console.error = originalError;
  }

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, 'Failed to save attendance');
  assert.equal(res.body.data, undefined);
  assert.equal(res.body.whatsapp_url, undefined);
});

test('teacher cannot mark a student from another batch', async () => {
  models.TeacherBatchAssignment.findOne = async () => ({ id: 1 });
  models.Batch.findByPk = async () => ({
    id: 1,
    name: 'Batch A',
    course_id: 10,
    Course: { id: 10, title: 'Class 9' },
  });
  models.Student.findOne = async () => null;
  models.Attendance.create = async () => { throw new Error('must not write'); };

  const res = makeRes();
  await manualSave({
    user: { id: 55 },
    body: { student_id: 999, batch_id: 1, date: '2026-10-23', session: 'morning', status: 'present' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /not enrolled/);
});

test('admin manual save requires the selected class as well as the batch', async () => {
  models.Attendance.create = async () => { throw new Error('must not write'); };

  const res = makeRes();
  await adminManualSave({
    user: { id: 1, role: 'admin' },
    body: { student_id: 100, batch_id: 1, date: '2026-10-23', session: 'morning', status: 'present' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /course_id/);
});

test('missing required save fields are rejected before any database write', async () => {
  models.Attendance.create = async () => { throw new Error('must not write'); };

  const res = makeRes();
  await manualSave({
    user: { id: 55 },
    body: { batch_id: 1, date: '2026-10-23', status: 'present' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /student_id/);
});
