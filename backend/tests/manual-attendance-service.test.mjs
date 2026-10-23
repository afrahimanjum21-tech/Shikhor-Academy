import test, { after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import {
  listEligibleStudents,
  saveManualAttendance,
  ManualAttendanceError,
} from '../services/attendance/ManualAttendanceService.js';

const originals = {
  batchFindByPk: models.Batch.findByPk,
  studentFindAll: models.Student.findAll,
  studentFindOne: models.Student.findOne,
  attendanceFindOne: models.Attendance.findOne,
  attendanceFindAll: models.Attendance.findAll,
  attendanceCreate: models.Attendance.create,
};

afterEach(() => {
  models.Batch.findByPk = originals.batchFindByPk;
  models.Student.findAll = originals.studentFindAll;
  models.Student.findOne = originals.studentFindOne;
  models.Attendance.findOne = originals.attendanceFindOne;
  models.Attendance.findAll = originals.attendanceFindAll;
  models.Attendance.create = originals.attendanceCreate;
});

after(async () => {
  try { await sequelize.close(); } catch { /* no DB connection was opened */ }
});

const batch = () => ({
  id: 1,
  name: 'Batch A',
  course_id: 10,
  Course: { id: 10, title: 'Class 9' },
});

const student = (overrides = {}) => ({
  id: 100,
  user_id: 5,
  student_id_card_no: 'ST-100',
  guardian_phone: '01712345678',
  father_phone: null,
  mother_phone: null,
  admission_date: '2026-01-01',
  User: { id: 5, name: 'Ayesha Rahman' },
  ...overrides,
});

test('daily sheet lists only eligible students with masked guardian data and current status', async () => {
  models.Batch.findByPk = async () => batch();
  models.Student.findAll = async () => [
    student(),
    student({
      id: 101,
      user_id: 6,
      student_id_card_no: 'ST-101',
      guardian_phone: null,
      father_phone: '01812345678',
      User: { id: 6, name: 'Rafi' },
    }),
  ];
  models.Attendance.findAll = async () => [{
    id: 7,
    student_id: 100,
    date: '2026-10-23',
    session: 'morning',
    status: 'present',
  }];

  const result = await listEligibleStudents({
    batchId: 1,
    courseId: 10,
    date: '2026-10-23',
    session: 'morning',
  });

  assert.equal(result.batch.course_title, 'Class 9');
  assert.equal(result.students.length, 2);
  assert.equal(result.students[0].attendance.status, 'present');
  assert.equal(result.students[0].guardian_masked, '+880 •••• 5678');
  assert.equal(result.students[0].guardian_source_label, 'Guardian');
  assert.equal(result.students[1].guardian_source_label, 'Father');
  assert.equal(result.students[1].attendance, null);
  assert.ok(!('guardian_phone' in result.students[0]));
  assert.ok(!('father_phone' in result.students[1]));
});

test('saving updates the existing row (no duplicate), keeps biometric/leave metadata, and prepares Present WhatsApp', async () => {
  models.Batch.findByPk = async () => batch();
  models.Student.findOne = async () => student();
  const existing = {
    id: 7,
    date: '2026-10-23',
    session: 'morning',
    status: 'absent',
    course_id: 99,
    punch_in_at: '08:00:00',
    leave_status: 'approved',
    saved: false,
    async save() { this.saved = true; },
  };
  models.Attendance.findOne = async () => existing;
  models.Attendance.create = async () => { throw new Error('must update, not duplicate'); };

  const result = await saveManualAttendance({
    batchId: 1,
    courseId: 10,
    studentId: 100,
    date: '2026-10-23',
    session: 'morning',
    status: 'present',
  });

  assert.equal(existing.saved, true);
  assert.equal(existing.status, 'present');
  assert.equal(existing.course_id, 10);
  assert.equal(existing.punch_in_at, '08:00:00');
  assert.equal(existing.leave_status, 'approved');
  assert.equal(result.attendance.previous_status, 'absent');
  assert.equal(result.attendance.status, 'present');
  assert.ok(result.whatsapp_url.startsWith('https://wa.me/8801712345678?text='));
  const message = new URL(result.whatsapp_url).searchParams.get('text');
  assert.match(message, /Class 9 — Batch A/);
  assert.match(message, /marked PRESENT/);
  assert.match(message, /Ayesha Rahman/);
  assert.equal(result.notification.prepared, true);
});

test('a concurrent duplicate insert falls back to updating the winning row', async () => {
  models.Batch.findByPk = async () => batch();
  models.Student.findOne = async () => student();
  const existing = {
    id: 8,
    date: '2026-10-23',
    session: 'morning',
    status: 'absent',
    course_id: 99,
    saved: false,
    async save() { this.saved = true; },
  };
  let findCalls = 0;
  models.Attendance.findOne = async () => {
    findCalls += 1;
    return findCalls === 1 ? null : existing;
  };
  models.Attendance.create = async () => {
    const error = new Error('duplicate key');
    error.name = 'SequelizeUniqueConstraintError';
    throw error;
  };

  const result = await saveManualAttendance({
    batchId: 1,
    courseId: 10,
    studentId: 100,
    date: '2026-10-23',
    session: 'morning',
    status: 'present',
  });

  assert.equal(findCalls, 2);
  assert.equal(existing.saved, true);
  assert.equal(existing.status, 'present');
  assert.equal(existing.course_id, 10);
  assert.equal(result.attendance.previous_status, 'absent');
});

test('saving Absent creates a manual row and prepares the Absent template', async () => {
  models.Batch.findByPk = async () => batch();
  models.Student.findOne = async () => student();
  models.Attendance.findOne = async () => null;
  let captured;
  models.Attendance.create = async (values) => {
    captured = values;
    return { id: 20, ...values };
  };

  const result = await saveManualAttendance({
    batchId: 1,
    studentId: 100,
    date: '2026-10-23',
    session: 'evening',
    status: 'absent',
  });

  assert.equal(captured.status, 'absent');
  assert.equal(captured.course_id, 10);
  assert.equal(captured.batch_id, 1);
  assert.equal(result.attendance.previous_status, null);
  const message = new URL(result.whatsapp_url).searchParams.get('text');
  assert.match(message, /marked ABSENT/);
  assert.doesNotMatch(message, /marked PRESENT/);
});

test('a missing guardian number still saves attendance and reports no WhatsApp link', async () => {
  models.Batch.findByPk = async () => batch();
  models.Student.findOne = async () => student({
    guardian_phone: null,
    father_phone: null,
    mother_phone: null,
  });
  models.Attendance.findOne = async () => null;
  models.Attendance.create = async (values) => ({ id: 21, ...values });

  const result = await saveManualAttendance({
    batchId: 1,
    studentId: 100,
    date: '2026-10-23',
    session: 'morning',
    status: 'present',
  });

  assert.equal(result.attendance.status, 'present');
  assert.equal(result.whatsapp_url, null);
  assert.equal(result.notification.prepared, false);
  assert.equal(result.guardian.available, false);
  assert.equal(result.guardian.masked, null);
});

test('rejects a student who is not enrolled in the selected class/batch before writing', async () => {
  models.Batch.findByPk = async () => batch();
  models.Student.findOne = async () => null;
  models.Attendance.create = async () => { throw new Error('must not write'); };

  await assert.rejects(
    saveManualAttendance({
      batchId: 1,
      courseId: 10,
      studentId: 999,
      date: '2026-10-23',
      session: 'morning',
      status: 'present',
    }),
    (error) => error instanceof ManualAttendanceError && /not enrolled/.test(error.message),
  );
});

test('rejects a batch that does not belong to the selected class', async () => {
  models.Batch.findByPk = async () => batch();

  await assert.rejects(
    listEligibleStudents({ batchId: 1, courseId: 99, date: '2026-10-23', session: 'morning' }),
    (error) => error instanceof ManualAttendanceError && /does not belong/.test(error.message),
  );
});

test('rejects invalid dates, sessions, statuses, and missing batches', async () => {
  models.Batch.findByPk = async () => null;

  await assert.rejects(
    saveManualAttendance({ batchId: 1, studentId: 100, date: '2026-02-30', session: 'morning', status: 'present' }),
    /valid attendance date/,
  );
  await assert.rejects(
    saveManualAttendance({ batchId: 1, studentId: 100, date: '2026-10-23', session: 'afternoon', status: 'present' }),
    /morning or evening/,
  );
  await assert.rejects(
    saveManualAttendance({ batchId: 1, studentId: 100, date: '2026-10-23', session: 'morning', status: 'late' }),
    /present or absent/,
  );
  await assert.rejects(
    listEligibleStudents({ batchId: 1, date: '2026-10-23', session: 'morning' }),
    /Batch not found/,
  );
});
