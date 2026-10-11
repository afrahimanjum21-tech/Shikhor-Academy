import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import NotificationService from '../services/NotificationService.js';
import { approveAdmission } from '../services/AdmissionService.js';

// B1 (identity integrity) + C10 (transactional) + C14 (unique id). No real DB /
// email: sequelize.transaction + model methods are stubbed, admission.email is
// null (so the post-commit status email early-returns), NotificationService is
// stubbed. We pass the `email` arg where a user email is needed.

const orig = {
  txn: sequelize.transaction,
  admFindByPk: models.AdmissionApplication.findByPk,
  userFindOne: models.User.findOne,
  userCreate: models.User.create,
  studentFindOne: models.Student.findOne,
  studentCreate: models.Student.create,
  studentFindAll: models.Student.findAll,
  notify: NotificationService.create,
};

function installCommon() {
  sequelize.transaction = async (cb) => cb({ LOCK: { UPDATE: 'UPDATE' } }); // run cb with a fake tx
  models.Student.findAll = async () => [];       // nextStudentId -> ...-0001
  NotificationService.create = async () => ({});
}

afterEach(() => {
  sequelize.transaction = orig.txn;
  models.AdmissionApplication.findByPk = orig.admFindByPk;
  models.User.findOne = orig.userFindOne;
  models.User.create = orig.userCreate;
  models.Student.findOne = orig.studentFindOne;
  models.Student.create = orig.studentCreate;
  models.Student.findAll = orig.studentFindAll;
  NotificationService.create = orig.notify;
});
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const admission = (over = {}) => ({
  id: 1, status: 'pending', email: null, full_name: 'A', course_id: null, phone: '1',
  async update(v) { Object.assign(this, v); },
  ...over,
});

test('refuses to bind a student onto an existing NON-student account (409, no student created)', async () => {
  installCommon();
  models.AdmissionApplication.findByPk = async () => admission();
  models.User.findOne = async () => ({ id: 9, role: 'admin', email: 'x@y.com' });
  let created = false;
  models.Student.create = async () => { created = true; return {}; };
  await assert.rejects(() => approveAdmission({ admissionId: 1, email: 'x@y.com' }), (e) => e.status === 409);
  assert.equal(created, false);
});

test('refuses an already-approved admission (400, idempotent)', async () => {
  installCommon();
  models.AdmissionApplication.findByPk = async () => admission({ status: 'approved' });
  await assert.rejects(() => approveAdmission({ admissionId: 1, email: 'x@y.com' }), (e) => e.status === 400);
});

test('restores a soft-deleted student account rather than leaving it unusable', async () => {
  installCommon();
  let restored = false;
  models.AdmissionApplication.findByPk = async () => admission();
  models.User.findOne = async () => ({ id: 5, role: 'student', email: 's@x.com', deletedAt: new Date(), name: 'S', async restore() { restored = true; }, async save() {} });
  models.Student.findOne = async () => ({ id: 1 });
  const out = await approveAdmission({ admissionId: 1, email: 's@x.com' });
  assert.equal(restored, true);
  assert.equal(out.isNewUser, true);
});

test('new applicant: creates user+student, approves, generates a password, normalizes email', async () => {
  installCommon();
  const adm = admission();
  models.AdmissionApplication.findByPk = async () => adm;
  models.User.findOne = async () => null;
  models.User.create = async (v) => ({ id: 7, ...v });
  models.Student.findOne = async () => null;
  let studentValues;
  models.Student.create = async (v) => { studentValues = v; return { id: 1, ...v }; };
  const out = await approveAdmission({ admissionId: 1, email: 'New@Case.com' });
  assert.equal(out.isNewUser, true);
  assert.ok(out.plainPassword && out.plainPassword.length > 0);
  assert.equal(adm.status, 'approved');
  assert.equal(out.user.email, 'new@case.com');
  assert.ok(String(studentValues.student_id_card_no).startsWith(`UCC-${new Date().getFullYear()}-`));
});

test('existing ACTIVE student: reuses the account, no duplicate student profile', async () => {
  installCommon();
  models.AdmissionApplication.findByPk = async () => admission();
  models.User.findOne = async () => ({ id: 3, role: 'student', email: 'a@b.com', deletedAt: null, async save() {} });
  let created = false;
  models.Student.findOne = async () => ({ id: 2 });
  models.Student.create = async () => { created = true; return {}; };
  const out = await approveAdmission({ admissionId: 1, email: 'a@b.com' });
  assert.equal(created, false);
  assert.equal(out.isNewUser, false);
});
