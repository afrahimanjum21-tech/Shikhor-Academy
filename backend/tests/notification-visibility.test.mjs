import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import {
  isStaffRole,
  isStudentOnlyAction,
  notificationVisibilityWhere,
} from '../services/notificationVisibility.js';

test('recognizes staff roles', () => {
  assert.equal(isStaffRole('admin'), true);
  assert.equal(isStaffRole('super_admin'), true);
  assert.equal(isStaffRole('teacher'), true);
  assert.equal(isStaffRole('student'), false);
});

test('detects student-only action URLs', () => {
  assert.equal(isStudentOnlyAction('/student/attendance-report'), true);
  assert.equal(isStudentOnlyAction('/admin/leave-requests'), false);
  assert.equal(isStudentOnlyAction(null), false);
});

test('staff queries exclude student-portal notifications', () => {
  const where = notificationVisibilityWhere({ id: 7, role: 'super_admin' });
  assert.equal(where.user_id, 7);
  assert.ok(Array.isArray(where[Op.or]));
  assert.deepEqual(where[Op.or], [
    { action_url: null },
    { action_url: '' },
    { action_url: { [Op.notLike]: '/student/%' } },
  ]);
});

test('student queries stay user-scoped without an action filter', () => {
  const where = notificationVisibilityWhere({ id: 9, role: 'student' });
  assert.deepEqual(where, { user_id: 9 });
  assert.equal(where[Op.or], undefined);
});
