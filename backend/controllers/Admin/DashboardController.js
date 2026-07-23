import models from '../../models/index.js';

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
      models.Student.count(),
      models.User.count({ where: { role: 'teacher', deletedAt: null } }),
      models.Faculty.count({ where: { deletedAt: null } }),
      models.Course.count(),
      models.Batch.count(),
      models.AdmissionApplication.count({ where: { status: 'pending' } }),
      models.Payment.count({ where: { status: 'pending' } }),
      models.Attendance.count({ where: { leave_status: 'pending' } }),
      models.AdmissionApplication.count({ where: { status: 'hold' } }),
    ]);

    res.json({
      total_students,
      total_teachers,
      total_faculty,
      total_courses,
      total_batches,
      pending_admissions,
      pending_payments,
      pending_leave_requests,
      hold_admissions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};
