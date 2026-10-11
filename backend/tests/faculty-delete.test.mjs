import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import { destroy } from '../controllers/Admin/FacultyManagementController.js';

// E1 — deleting a PUBLIC Faculty card must NOT delete the linked teacher's
// User account, TeacherProfile, or batch assignments.

const orig = {
  facFindByPk: models.Faculty.findByPk,
  userFindOne: models.User.findOne,
  tba: models.TeacherBatchAssignment.destroy,
  tp: models.TeacherProfile.destroy,
};
afterEach(() => {
  models.Faculty.findByPk = orig.facFindByPk;
  models.User.findOne = orig.userFindOne;
  models.TeacherBatchAssignment.destroy = orig.tba;
  models.TeacherProfile.destroy = orig.tp;
});
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

test('removing a Faculty card soft-deletes ONLY the card; the teacher account is retained', async () => {
  let facultyDestroyed = false;
  let touchedTeacher = false;
  models.Faculty.findByPk = async () => ({
    id: 2, user_id: 5, profile_photo_path: null, cover_photo_path: null,
    destroy: async () => { facultyDestroyed = true; },
  });
  // If the controller still tried to delete the teacher, these would fire.
  models.User.findOne = async () => { touchedTeacher = true; return { id: 5, destroy: async () => { touchedTeacher = true; } }; };
  models.TeacherBatchAssignment.destroy = async () => { touchedTeacher = true; };
  models.TeacherProfile.destroy = async () => { touchedTeacher = true; };

  const res = makeRes();
  await destroy({ params: { id: 2 } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(facultyDestroyed, true, 'the Faculty card is removed');
  assert.equal(touchedTeacher, false, 'the teacher User/profile/assignments are NOT touched');
});
