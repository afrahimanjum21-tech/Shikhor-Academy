import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeLeaveRequest, serializeLeaveRequests } from '../services/leaveSerializer.js';

// B4 — normalize the capitalized Sequelize shape (Student.User) into the
// lowercase student.user the admin UI reads. Pure.

test('populated row exposes student.user.name (the field the UI reads)', () => {
  const row = {
    id: 7, date: '2026-10-12', session: 'morning', status: 'leave',
    leave_status: 'pending', leave_reason: 'sick',
    Student: { id: 3, student_id_card_no: 'UCC-2026-0003', User: { id: 9, name: 'Rahim', email: 'r@x.com', phone: '017' } },
    Approver: null,
  };
  const out = serializeLeaveRequest(row);
  assert.equal(out.student.user.name, 'Rahim');
  assert.equal(out.student.card_no, 'UCC-2026-0003');
  assert.equal(out.leave_reason, 'sick');
  assert.equal(out.date, '2026-10-12');
});

test('missing related user does not throw and yields user: null', () => {
  const out = serializeLeaveRequest({ id: 1, Student: { id: 2, student_id_card_no: null } });
  assert.equal(out.student.user, null);
  assert.equal(out.student.id, 2);
});

test('missing student yields student: null', () => {
  const out = serializeLeaveRequest({ id: 1, leave_status: 'pending' });
  assert.equal(out.student, null);
});

test('serializeLeaveRequests maps an empty list to []', () => {
  assert.deepEqual(serializeLeaveRequests([]), []);
  assert.deepEqual(serializeLeaveRequests(null), []);
});
