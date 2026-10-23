import { Op } from 'sequelize';

// Notifications aimed at a student's own portal must never leak into a staff
// bell. `super_admin` can open student pages (and the role middleware lets it
// through), so a staff account can end up owning a row whose action points at
// `/student/...`. Keep those rows out of every staff-facing notification query
// without deleting data.
const STAFF_ROLES = new Set(['admin', 'super_admin', 'teacher']);

export const isStaffRole = (role) => STAFF_ROLES.has(role);

export const isStudentOnlyAction = (actionUrl) =>
  typeof actionUrl === 'string' && actionUrl.startsWith('/student/');

export const notificationVisibilityWhere = (user) => {
  const where = { user_id: user.id };

  if (isStaffRole(user.role)) {
    where[Op.or] = [
      { action_url: null },
      { action_url: '' },
      { action_url: { [Op.notLike]: '/student/%' } },
    ];
  }

  return where;
};
