import models from '../../models/index.js';
import { Op } from 'sequelize';

export const stats = async (req, res) => {
  try {
    const [
      total_students,
      total_teachers,
      total_faculty,
      total_courses,
      total_batches,
      pending_admissions,
      pending_payments,
      pending_leave_requests,
      hold_admissions,
    ] = await Promise.all([
      models.User.count({ where: { role: 'student' } }),
      models.User.count({ where: { role: 'teacher' } }),
      models.Faculty.count({ where: { deletedAt: null } }),
      models.Course.count({ where: { is_active: true } }),
      models.Batch.count(),
      models.AdmissionApplication.count({ where: { status: 'pending' } }),
      models.Payment.count({ where: { status: 'pending' } }),
      models.Attendance.count({ where: { leave_status: 'pending' } }),
      models.AdmissionApplication.count({ where: { status: 'hold' } }),
    ]);

    const teacherUsers = await models.User.findAll({ where: { role: 'teacher' }, attributes: ['id'] });
    const facultyRows = await models.Faculty.findAll({ where: { user_id: { [Op.ne]: null } }, attributes: ['user_id'] });
    const staffIds = new Set([
      ...teacherUsers.map(u => u.id),
      ...facultyRows.map(f => f.user_id),
    ]);
    const total_staff = staffIds.size;

    res.json({
      total_students,
      total_teachers,
      total_faculty,
      total_staff,
      total_courses,
      total_batches,
      pending_admissions,
      pending_payments,
      pending_leave_requests,
      hold_admissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};
