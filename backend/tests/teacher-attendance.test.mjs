import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import { markAttendance } from '../controllers/Teacher/TeacherAttendanceController.js';

// C2/I-2 + C3 — teacher attendance derives course_id from the validated batch
// (not the client) and always writes a non-null session.

const orig = {
  tba: models.TeacherBatchAssignment.findOne,
  batch: models.Batch.findByPk,
  student: models.Student.findAll,
  bulk: models.Attendance.bulkCreate,
};
afterEach(() => {
  models.TeacherBatchAssignment.findOne = orig.tba;
  models.Batch.findByPk = orig.batch;
  models.Student.findAll = orig.student;
  models.Attendance.bulkCreate = orig.bulk;
});
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('derives course_id from the batch (ignores client course_id) and writes a non-null session', async () => {
  models.TeacherBatchAssignment.findOne = async () => ({ id: 1 });
  models.Batch.findByPk = async () => ({ id: 1, course_id: 10 });
  models.Student.findAll = async () => [{ id: 100 }];
  let captured;
  models.Attendance.bulkCreate = async (data) => { captured = data; return data; };

  const res = makeRes();
  await markAttendance({
    user: { id: 55 },
    body: { batch_id: 1, date: '2026-10-12', session: null, course_id: 999, records: [{ student_id: 100, status: 'present' }] },
  }, res);

  assert.equal(res.body.count, 1);
  assert.equal(captured[0].course_id, 10);          // derived from batch, not 999
  assert.notEqual(captured[0].session, null);        // C3: never null
  assert.ok(['morning', 'evening'].includes(captured[0].session));
});

test('rejects records for students outside the teacher\'s batch', async () => {
  models.TeacherBatchAssignment.findOne = async () => ({ id: 1 });
  models.Batch.findByPk = async () => ({ id: 1, course_id: 10 });
  models.Student.findAll = async () => []; // none of the submitted students are in the batch
  models.Attendance.bulkCreate = async () => { throw new Error('should not write'); };

  const res = makeRes();
  await markAttendance({
    user: { id: 55 },
    body: { batch_id: 1, date: '2026-10-12', records: [{ student_id: 100, status: 'present' }] },
  }, res);

  assert.equal(res.statusCode, 400);
});
