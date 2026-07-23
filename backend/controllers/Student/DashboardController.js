import models from '../../models/index.js';
import { Op, fn, col } from 'sequelize';

export const summary = async (req, res) => {
  try {
    const student = await models.Student.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: models.Batch,
          attributes: ['id', 'name'],
          include: [{ model: models.Course, attributes: ['id', 'title'] }],
        },
      ],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const totalClasses = await models.Attendance.count({ where: { student_id: student.id } });
    const presentCount = await models.Attendance.count({ where: { student_id: student.id, status: 'present' } });
    const attendancePercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

    const payments = await models.Payment.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
      limit: 12,
    });

    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const pendingAmount = payments
      .filter(p => p.status === 'due' || p.status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const upcomingEvents = await models.AcademicEvent.findAll({
      where: { date: { [Op.gte]: new Date().toISOString().split('T')[0] } },
      order: [['date', 'ASC']],
      limit: 5,
    });

    const recentResults = await models.ExamResult.findAll({
      where: { student_id: student.id },
      include: [{ model: models.Exam, attributes: ['id', 'name', 'date'] }],
      order: [['id', 'DESC']],
      limit: 5,
    });

    res.json({
      data: {
        student: {
          id: student.id,
          student_id_card_no: student.student_id_card_no,
          card_no: student.student_id_card_no,
          batch: student.Batch?.name || null,
          course: student.Batch?.Course?.title || null,
          admission_date: student.admission_date,
        },
        attendance: {
          total_classes: totalClasses,
          present: presentCount,
          percentage: attendancePercentage,
        },
        payment: {
          total_paid: totalPaid,
          pending_amount: pendingAmount,
          recent_payments: payments.slice(0, 5),
        },
        upcoming_events: upcomingEvents,
        recent_results: recentResults,
      },
    });
  } catch (error) {
    console.error('StudentDashboardController.summary error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary', error: error.message });
  }
};
