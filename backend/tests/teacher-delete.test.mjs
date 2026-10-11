import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import { destroy } from '../controllers/Admin/TeacherController.js';

// H-del1 + H-del3 — teacher deletion blocks when academic content exists;
// otherwise deletes the account + links atomically.

const orig = {
  userFindOne: models.User.findOne,
  aCount: models.Assignment.count,
  smCount: models.StudyMaterial.count,
  erCount: models.ExamResult.count,
  tba: models.TeacherBatchAssignment.destroy,
  tp: models.TeacherProfile.destroy,
  fac: models.Faculty.destroy,
  routine: models.Routine.update,
  attendance: models.Attendance.update,
  tx: sequelize.transaction,
};
afterEach(() => {
  models.User.findOne = orig.userFindOne;
  models.Assignment.count = orig.aCount;
  models.StudyMaterial.count = orig.smCount;
  models.ExamResult.count = orig.erCount;
  models.TeacherBatchAssignment.destroy = orig.tba;
  models.TeacherProfile.destroy = orig.tp;
  models.Faculty.destroy = orig.fac;
  models.Routine.update = orig.routine;
  models.Attendance.update = orig.attendance;
  sequelize.transaction = orig.tx;
});
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('blocks (409) when the teacher authored assignments/materials/marks', async () => {
  models.User.findOne = async () => ({ id: 5, profile_photo_path: null, destroy: async () => {} });
  models.Assignment.count = async () => 3;
  models.StudyMaterial.count = async () => 0;
  models.ExamResult.count = async () => 0;
  let txRan = false;
  sequelize.transaction = async () => { txRan = true; };

  const res = makeRes();
  await destroy({ params: { id: 5 } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(txRan, false, 'must not delete anything when blocked');
});

test('deletes atomically when the teacher has no academic content', async () => {
  let destroyed = false;
  models.User.findOne = async () => ({ id: 5, profile_photo_path: null, destroy: async () => { destroyed = true; } });
  models.Assignment.count = async () => 0;
  models.StudyMaterial.count = async () => 0;
  models.ExamResult.count = async () => 0;
  models.TeacherBatchAssignment.destroy = async () => {};
  models.TeacherProfile.destroy = async () => {};
  models.Faculty.destroy = async () => {};
  models.Routine.update = async () => {};
  models.Attendance.update = async () => {};
  sequelize.transaction = async (cb) => cb({});

  const res = makeRes();
  await destroy({ params: { id: 5 } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(destroyed, true, 'teacher account removed inside the transaction');
});
