import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import models, { sequelize } from '../models/index.js';
import { getStudentsForExam } from '../controllers/Teacher/TeacherMarksController.js';

// H-sec1 — getStudentsForExam must only return students in the teacher's OWN
// assigned batches, never every batch of the exam's course (which would leak
// sibling-batch students' name/email/phone/photo PII).

const orig = {
  exam: models.Exam.findByPk,
  batch: models.Batch.findAll,
  tba: models.TeacherBatchAssignment.findAll,
  student: models.Student.findAll,
  result: models.ExamResult.findAll,
};
afterEach(() => {
  models.Exam.findByPk = orig.exam;
  models.Batch.findAll = orig.batch;
  models.TeacherBatchAssignment.findAll = orig.tba;
  models.Student.findAll = orig.student;
  models.ExamResult.findAll = orig.result;
});
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('scopes the student query to the teacher\'s assigned batches only', async () => {
  models.Exam.findByPk = async () => ({ id: 7, course_id: 10 });
  // Course 10 has batches 1,2,3 — but the teacher is only assigned to batch 1.
  models.Batch.findAll = async () => [{ id: 1 }, { id: 2 }, { id: 3 }];
  models.TeacherBatchAssignment.findAll = async () => [{ batch_id: 1 }];
  let studentWhere = null;
  models.Student.findAll = async (opts) => { studentWhere = opts.where; return [{ id: 100, current_batch_id: 1 }]; };
  models.ExamResult.findAll = async () => [];

  const res = makeRes();
  await getStudentsForExam({ user: { id: 55 }, params: { examId: 7 } }, res);

  assert.equal(res.statusCode, 200);
  // The ONLY batch filter must be the assigned batch [1] — not [1,2,3].
  assert.deepEqual(studentWhere.current_batch_id[Op.in], [1]);
});

test('403 when the teacher is assigned to no batch in the course', async () => {
  models.Exam.findByPk = async () => ({ id: 7, course_id: 10 });
  models.Batch.findAll = async () => [{ id: 1 }, { id: 2 }];
  models.TeacherBatchAssignment.findAll = async () => []; // not assigned
  let called = false;
  models.Student.findAll = async () => { called = true; return []; };
  models.ExamResult.findAll = async () => [];

  const res = makeRes();
  await getStudentsForExam({ user: { id: 55 }, params: { examId: 7 } }, res);

  assert.equal(res.statusCode, 403);
  assert.equal(called, false); // never queried students → no PII leaked
});
