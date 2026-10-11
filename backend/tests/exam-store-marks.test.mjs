import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import models, { sequelize } from '../models/index.js';
import { storeMarks } from '../controllers/Admin/ExamController.js';

// §D(B) storeMarks: course/batch scope + transactional batch + I-14 validation.

const orig = {
  examFindByPk: models.Exam.findByPk,
  batchFindAll: models.Batch.findAll,
  studentFindAll: models.Student.findAll,
  upsert: models.ExamResult.upsert,
  erFindAll: models.ExamResult.findAll,
  tx: sequelize.transaction,
};
afterEach(() => {
  models.Exam.findByPk = orig.examFindByPk;
  models.Batch.findAll = orig.batchFindAll;
  models.Student.findAll = orig.studentFindAll;
  models.ExamResult.upsert = orig.upsert;
  models.ExamResult.findAll = orig.erFindAll;
  sequelize.transaction = orig.tx;
});
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('B: rejects marks for a student not in the exam\'s course', async () => {
  models.Exam.findByPk = async () => ({ id: 1, course_id: 10, subject_marks: { Math: 100 } });
  models.Batch.findAll = async () => [{ id: 5 }];
  models.Student.findAll = async () => []; // student 100 not in batch 5
  let wrote = false;
  models.ExamResult.upsert = async () => { wrote = true; };

  const res = makeRes();
  await storeMarks({ body: { exam_id: 1, marks_data: [{ student_id: 100, marks_details: { Math: 80 } }] } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(wrote, false);
});

test('I-14: rejects an above-full mark before any write', async () => {
  models.Exam.findByPk = async () => ({ id: 1, course_id: 10, subject_marks: { Math: 100 } });
  models.Batch.findAll = async () => [{ id: 5 }];
  models.Student.findAll = async () => [{ id: 100 }];
  let wrote = false;
  models.ExamResult.upsert = async () => { wrote = true; };

  const res = makeRes();
  await storeMarks({ body: { exam_id: 1, marks_data: [{ student_id: 100, marks_details: { Math: 150 } }] } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(wrote, false);
});

test('a mid-batch write failure surfaces as an error (no partial success)', async () => {
  models.Exam.findByPk = async () => ({ id: 1, course_id: 10, subject_marks: { Math: 100 } });
  models.Batch.findAll = async () => [{ id: 5 }];
  models.Student.findAll = async () => [{ id: 100 }, { id: 101 }];
  sequelize.transaction = async (cb) => cb({}); // run the callback, propagate throws
  let calls = 0;
  models.ExamResult.upsert = async () => { calls += 1; if (calls === 2) throw new Error('db write failed'); };
  models.ExamResult.findAll = async () => [];

  const res = makeRes();
  await storeMarks({ body: { exam_id: 1, marks_data: [
    { student_id: 100, marks_details: { Math: 80 } },
    { student_id: 101, marks_details: { Math: 90 } },
  ] } }, res);

  assert.equal(res.statusCode, 500);           // failure surfaced, not a 200 partial
  assert.notEqual(res.body?.message, 'Marks saved successfully');
});
