import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import NotificationService from '../services/NotificationService.js';
import { store, requestLeave, punchOut } from '../controllers/Admin/AttendanceController.js';

// C1 (cross-course write), C4 (leave vs teacher mark), C5 (punch-out session).

const orig = {
  studentFindAll: models.Student.findAll,
  batchFindAll: models.Batch.findAll,
  studentFindOne: models.Student.findOne,
  attFindOne: models.Attendance.findOne,
  attUpsert: models.Attendance.upsert,
  bulk: models.Attendance.bulkCreate,
  notifyAdmins: NotificationService.createForAdmins,
};
afterEach(() => {
  models.Student.findAll = orig.studentFindAll;
  models.Batch.findAll = orig.batchFindAll;
  models.Student.findOne = orig.studentFindOne;
  models.Attendance.findOne = orig.attFindOne;
  models.Attendance.upsert = orig.attUpsert;
  models.Attendance.bulkCreate = orig.bulk;
  NotificationService.createForAdmins = orig.notifyAdmins;
});
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

// ---- C1: cross-course write rejection ----
test('store rejects a student who is not in the selected course', async () => {
  models.Student.findAll = async () => [{ id: 100, current_batch_id: 9 }]; // batch 9
  models.Batch.findAll = async () => [{ id: 1 }, { id: 2 }];                // course batches 1,2
  models.Attendance.bulkCreate = async () => { throw new Error('must not write'); };

  const res = makeRes();
  await store({ body: { course_id: 10, date: '2026-10-12', records: [{ student_id: 100, status: 'present' }] } }, res);
  assert.equal(res.statusCode, 400);
});

test('store accepts a student who belongs to the course', async () => {
  models.Student.findAll = async () => [{ id: 100, current_batch_id: 1 }];
  models.Batch.findAll = async () => [{ id: 1 }, { id: 2 }];
  let wrote = false;
  models.Attendance.bulkCreate = async (data) => { wrote = true; return data; };

  const res = makeRes();
  await store({ body: { course_id: 10, date: '2026-10-12', records: [{ student_id: 100, status: 'present' }] } }, res);
  assert.equal(wrote, true);
  assert.equal(res.body.count, 1);
});

// ---- C4: leave must not clobber a teacher mark ----
test('requestLeave returns 409 when a teacher already marked the class', async () => {
  models.Student.findOne = async () => ({ id: 3, current_batch_id: 5 });
  models.Attendance.findOne = async () => ({ status: 'present', punch_in_at: '08:00:00', leave_status: 'none' });
  models.Attendance.upsert = async () => { throw new Error('must not overwrite'); };

  const res = makeRes();
  await requestLeave({ user: { id: 1, role: 'student' }, body: { date: '2099-01-01', reason: 'sick' } }, res);
  assert.equal(res.statusCode, 409);
});

test('requestLeave rejects staff accounts even though super_admin may pass authorize()', async () => {
  const res = makeRes();
  await requestLeave({ user: { id: 1, role: 'super_admin' }, body: { date: '2099-01-01', reason: 'sick' } }, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /student accounts/i);
});

test('requestLeave creates a pending leave when the slot is empty', async () => {
  models.Student.findOne = async () => ({ id: 3, current_batch_id: 5 });
  models.Attendance.findOne = async () => null;
  let saved;
  models.Attendance.upsert = async (vals) => { saved = vals; return [{ id: 1, ...vals }, true]; };
  NotificationService.createForAdmins = async () => ({});

  const res = makeRes();
  await requestLeave({ user: { id: 1, role: 'student' }, body: { date: '2099-01-01', reason: 'sick' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(saved.status, 'leave');
  assert.equal(saved.leave_status, 'pending');
  assert.notEqual(saved.session, null); // C3: non-null session
});

// ---- C5: punch-out finds the punch-in, not a clock-derived session ----
test('punchOut queries by punch-in presence without a clock-derived session', async () => {
  models.Student.findOne = async () => ({ id: 3 });
  let firstWhere = null;
  let savedRow = null;
  models.Attendance.findOne = async ({ where }) => {
    if (!firstWhere) {
      firstWhere = where;
      savedRow = { punch_in_at: '08:00:00', punch_out_at: null, save: async () => {} };
      return savedRow;
    }
    return null;
  };

  const res = makeRes();
  // Morning punch-in, punching out now (any time) with NO client session.
  await punchOut({ user: { id: 1 }, body: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.ok(!('session' in firstWhere), 'must not filter by a clock-derived session');
  assert.ok('punch_in_at' in firstWhere, 'must match on punch-in presence');
  assert.ok(savedRow.punch_out_at); // punch-out time was set
});
