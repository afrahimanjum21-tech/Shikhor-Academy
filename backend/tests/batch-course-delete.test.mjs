import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import models, { sequelize } from '../models/index.js';
import { destroy as batchDestroy } from '../controllers/Admin/BatchController.js';
import { destroy as courseDestroy } from '../controllers/Admin/CourseController.js';

// H-del2 + H-del3 — batch/course deletion blocks when academic history exists
// (student submissions / exam marks); otherwise cascades atomically.

const snap = {};
const save = (model, ...fns) => fns.forEach((fn) => { snap[`${model}.${fn}`] = models[model][fn]; });
['Batch', 'Course', 'Exam', 'Assignment', 'AssignmentSubmission', 'ExamResult', 'StudyMaterial', 'TeacherBatchAssignment', 'Routine', 'Student', 'AdmissionApplication'].forEach((m) => {
  ['findByPk', 'findAll', 'count', 'destroy', 'update'].forEach((fn) => { if (typeof models[m]?.[fn] === 'function') snap[`${m}.${fn}`] = models[m][fn]; });
});
const txSnap = sequelize.transaction;
afterEach(() => {
  Object.entries(snap).forEach(([k, v]) => { const [m, fn] = k.split('.'); models[m][fn] = v; });
  sequelize.transaction = txSnap;
});
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('batch delete blocks (409) when student submissions exist', async () => {
  models.Batch.findByPk = async () => ({ id: 3, destroy: async () => {} });
  models.Assignment.findAll = async () => [{ id: 1, attachment_path: null }];
  models.AssignmentSubmission.count = async () => 2;
  let txRan = false;
  sequelize.transaction = async () => { txRan = true; };

  const res = makeRes();
  await batchDestroy({ params: { id: 3 } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(txRan, false);
});

test('batch delete cascades atomically when there is no student work', async () => {
  let batchDestroyed = false;
  models.Batch.findByPk = async () => ({ id: 3, destroy: async () => { batchDestroyed = true; } });
  models.Assignment.findAll = async () => [{ id: 1, attachment_path: null }];
  models.AssignmentSubmission.count = async () => 0;
  models.StudyMaterial.findAll = async () => [];
  models.AssignmentSubmission.destroy = async () => {};
  models.TeacherBatchAssignment.destroy = async () => {};
  models.Routine.destroy = async () => {};
  models.Assignment.destroy = async () => {};
  models.StudyMaterial.destroy = async () => {};
  models.Student.update = async () => {};
  sequelize.transaction = async (cb) => cb({});

  const res = makeRes();
  await batchDestroy({ params: { id: 3 } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(batchDestroyed, true);
});

test('course delete blocks (409) when exam marks exist', async () => {
  models.Course.findByPk = async () => ({ id: 7, Batches: [{ id: 3 }], thumbnail: null, destroy: async () => {} });
  models.Exam.findAll = async () => [{ id: 9 }];
  models.Assignment.findAll = async () => [{ id: 1, attachment_path: null }];
  models.ExamResult.count = async () => 1;      // marks exist
  models.AssignmentSubmission.count = async () => 0;
  let txRan = false;
  sequelize.transaction = async () => { txRan = true; };

  const res = makeRes();
  await courseDestroy({ params: { id: 7 } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(txRan, false);
});

test('course delete cascades atomically when there is no academic history', async () => {
  let courseDestroyed = false;
  models.Course.findByPk = async () => ({ id: 7, Batches: [{ id: 3 }], thumbnail: null, destroy: async () => { courseDestroyed = true; } });
  models.Exam.findAll = async () => [{ id: 9 }];
  models.Assignment.findAll = async () => [{ id: 1, attachment_path: null }];
  models.ExamResult.count = async () => 0;
  models.AssignmentSubmission.count = async () => 0;
  models.StudyMaterial.findAll = async () => [];
  models.AssignmentSubmission.destroy = async () => {};
  models.ExamResult.destroy = async () => {};
  models.Exam.destroy = async () => {};
  models.TeacherBatchAssignment.destroy = async () => {};
  models.Routine.destroy = async () => {};
  models.Assignment.destroy = async () => {};
  models.StudyMaterial.destroy = async () => {};
  models.Student.update = async () => {};
  models.Batch.destroy = async () => {};
  models.AdmissionApplication.update = async () => {};
  sequelize.transaction = async (cb) => cb({});

  const res = makeRes();
  await courseDestroy({ params: { id: 7 } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(courseDestroyed, true);
});
