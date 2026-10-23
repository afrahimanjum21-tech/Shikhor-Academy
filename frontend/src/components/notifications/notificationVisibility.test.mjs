import test from 'node:test';
import assert from 'node:assert/strict';
import {
    isNotificationVisibleForRole,
    isStaffRole,
    isStudentOnlyAction,
} from './notificationVisibility.js';

test('recognizes staff roles', () => {
    assert.equal(isStaffRole('admin'), true);
    assert.equal(isStaffRole('super_admin'), true);
    assert.equal(isStaffRole('teacher'), true);
    assert.equal(isStaffRole('student'), false);
    assert.equal(isStaffRole(undefined), false);
});

test('detects only real student-portal action URLs', () => {
    assert.equal(isStudentOnlyAction('/student/attendance-report'), true);
    assert.equal(isStudentOnlyAction('/student'), false);
    assert.equal(isStudentOnlyAction('/admin/leave-requests'), false);
    assert.equal(isStudentOnlyAction(null), false);
});

test('hides student-only notifications from every staff role', () => {
    const notification = { action_url: '/student/attendance-report' };
    assert.equal(isNotificationVisibleForRole(notification, 'admin'), false);
    assert.equal(isNotificationVisibleForRole(notification, 'super_admin'), false);
    assert.equal(isNotificationVisibleForRole(notification, 'teacher'), false);
});

test('keeps student notifications for students and staff notifications for staff', () => {
    assert.equal(
        isNotificationVisibleForRole({ action_url: '/student/attendance-report' }, 'student'),
        true,
    );
    assert.equal(
        isNotificationVisibleForRole({ action_url: '/admin/leave-requests' }, 'admin'),
        true,
    );
    assert.equal(
        isNotificationVisibleForRole({ action_url: '/admin/leave-requests' }, 'super_admin'),
        true,
    );
});

test('does not hide notifications without an action URL', () => {
    assert.equal(isNotificationVisibleForRole({}, 'admin'), true);
    assert.equal(isNotificationVisibleForRole({ action_url: '' }, 'admin'), true);
    assert.equal(isNotificationVisibleForRole(null, 'admin'), true);
});
