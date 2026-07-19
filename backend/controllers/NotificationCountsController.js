import models from '../models/index.js';
import { Op } from 'sequelize';

export const counts = async (req, res) => {
  try {
    const user = req.user;
    const counts = {};

    const unreadNotifications = await models.Notification.count({
      where: { user_id: user.id, read_at: null },
    });

    counts.notifications = unreadNotifications;

    if (user.role === 'admin' || user.role === 'super_admin') {
      const [pendingAdmissions, pendingPayments, pendingLeaves, unreadContacts] = await Promise.all([
        models.AdmissionApplication.count({ where: { status: 'pending' } }),
        models.Payment.count({ where: { status: 'pending' } }),
        models.Attendance.count({ where: { leave_status: 'pending' } }),
        models.ContactMessage.count({ where: { is_read: false } }),
      ]);

      counts.pending_admissions = pendingAdmissions;
      counts.pending_payments = pendingPayments;
      counts.pending_leaves = pendingLeaves;
      counts.unread_contacts = unreadContacts;
    }

    if (user.role === 'teacher') {
      const teacherId = user.id;

      const batchIds = await models.TeacherBatchAssignment.findAll({
        where: { teacher_id: teacherId },
        attributes: ['batch_id'],
      }).then(rows => rows.map(r => r.batch_id));

      const [pendingSubmissions, totalStudents] = await Promise.all([
        models.AssignmentSubmission.count({
          where: { status: 'submitted' },
          include: [{
            model: models.Assignment,
            where: { teacher_id: teacherId },
            attributes: [],
          }],
        }),
        models.Student.count({
          where: { current_batch_id: { [Op.in]: batchIds } },
        }),
      ]);

      counts.pending_submissions = pendingSubmissions;
      counts.total_students = totalStudents;
    }

    if (user.role === 'student') {
      const student = await models.Student.findOne({ where: { user_id: user.id } });

      if (student) {
        const [pendingPayments, gradedResults] = await Promise.all([
          models.Payment.count({
            where: { student_id: student.id, status: 'due' },
          }),
          models.AssignmentSubmission.count({
            where: { student_id: student.id, status: 'graded' },
          }),
        ]);

        counts.due_payments = pendingPayments;
        counts.graded_results = gradedResults;
      }
    }

    res.json({ data: counts });
  } catch (error) {
    console.error('NotificationCountsController.counts error:', error);
    res.status(500).json({ message: 'Failed to fetch counts', error: error.message });
  }
};
