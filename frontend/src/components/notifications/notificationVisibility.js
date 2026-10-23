const STAFF_ROLES = new Set(['admin', 'super_admin', 'teacher']);

export const isStaffRole = (role) => STAFF_ROLES.has(role);

export const isStudentOnlyAction = (actionUrl) =>
    typeof actionUrl === 'string' && actionUrl.startsWith('/student/');

// Mirrors backend/services/notificationVisibility.js: staff must never see a
// student-portal notification (e.g. "Leave Request Submitted") in their bell.
export const isNotificationVisibleForRole = (notification, role) =>
    !(isStaffRole(role) && isStudentOnlyAction(notification?.action_url));
