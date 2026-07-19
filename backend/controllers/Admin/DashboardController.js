import models from '../../models/index.js';

export const stats = async (req, res) => {
  try {
    const [
      students,
      teachers,
      faculty,
      courses,
      batches,
      pendingAdmissions,
      pendingPayments,
      pendingLeaves,
    ] = await Promise.all([
      models.Student.count(),
      models.User.count({ where: { role: 'teacher', deleted_at: null } }),
      models.Faculty.count({ where: { deleted_at: null } }),
      models.Course.count(),
      models.Batch.count(),
      models.AdmissionApplication.count({ where: { status: 'pending' } }),
      models.Payment.count({ where: { status: 'pending' } }),
      models.Attendance.count({ where: { leave_status: 'pending' } }),
    ]);

    res.json({
      students,
      teachers,
      faculty,
      courses,
      batches,
      pending_admissions: pendingAdmissions,
      pending_payments: pendingPayments,
      pending_leaves: pendingLeaves,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};
