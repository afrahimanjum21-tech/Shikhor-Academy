import models, { sequelize } from '../../models/index.js';
import { Op } from 'sequelize';
import ExamResultService from '../../services/ExamResultService.js';
import { summarizeFees } from '../../services/feeBreakdown.js';
import { attendanceSummary } from '../../services/attendanceStats.js';

export const summary = async (req, res) => {
  try {
    const [student, upcomingEvents] = await Promise.all([
      models.Student.findOne({
        where: { user_id: req.user.id },
        include: [
          {
            model: models.Batch,
            attributes: ['id', 'name', 'class_link'],
            include: [{ model: models.Course, attributes: ['id', 'title', 'fee'] }],
          },
        ],
      }),
      models.AcademicEvent.findAll({
        where: { date: { [Op.gte]: new Date().toISOString().split('T')[0] } },
        order: [['date', 'ASC']],
        limit: 5,
      }),
    ]);

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const monthlyFee = parseFloat(student.Batch?.Course?.fee) || 0;

    const [attendanceRows, payments, recentResults] = await Promise.all([
      models.Attendance.findAll({
        where: { student_id: student.id },
        attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'cnt']],
        group: ['status'],
      }),
      models.Payment.findAll({
        where: { student_id: student.id },
        order: [['date', 'DESC']],
      }),
      models.ExamResult.findAll({
        where: { student_id: student.id },
        include: [{
          model: models.Exam,
          attributes: ['id', 'name', 'date', 'type', 'total_marks', 'subjects', 'subject_marks', 'is_published', 'published_subjects'],
          include: [{ model: models.Course, attributes: ['id', 'title'] }],
        }],
        order: [['id', 'DESC']],
        limit: 5,
      }),
    ]);

    const attendanceMap = {};
    attendanceRows.forEach((row) => {
      attendanceMap[row.status] = parseInt(row.get('cnt'), 10) || 0;
    });
    // I-19: use the SAME eligible-day rule as the attendance page (present +
    // absent + late + approved leave; pending/rejected leave excluded) so the
    // dashboard percentage can never disagree with /student/attendance stats.
    const presentCount = attendanceMap.present || 0;
    const approvedLeaveCount = await models.Attendance.count({
      where: { student_id: student.id, status: 'leave', leave_status: 'approved' },
    });
    const attendanceCalc = attendanceSummary({
      present: presentCount,
      absent: attendanceMap.absent || 0,
      late: attendanceMap.late || 0,
      approvedLeave: approvedLeaveCount,
    });
    const totalClasses = attendanceCalc.eligibleDays;
    const attendancePercentage = attendanceCalc.percentage;

    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const pendingAmount = payments
      .filter(p => p.status === 'due' || p.status === 'pending')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const pendingCount = payments.filter(p => p.status === 'pending').length;
    // I-11: derive due-months + total due from the SAME monthly breakdown the
    // fees page uses (summarizeFees), so the dashboard and fees page can never
    // disagree on what the student owes.
    const { dueMonths, totalDue } = summarizeFees(student, payments, monthlyFee);

    // Only show results that are published (fully or subject by subject), and
    // normalize aliases to lowercase so consumers can read result.exam. Then
    // recompute percentage/grade/gpa/position on the same basis the student
    // results page uses.
    const normalizedRecentResults = await ExamResultService.enrichResults(
      recentResults
        .filter(r => r.Exam?.is_published || (r.Exam?.published_subjects || []).length > 0)
        .map(result => {
          const data = result.toJSON();
          data.exam = data.Exam || null;
          if (data.exam?.Course) {
            data.exam.course = data.exam.Course;
            delete data.exam.Course;
          }
          delete data.Exam;
          return data;
        }),
      { restrictToPublished: true }
    );

    const paymentBlock = {
      course_fee: monthlyFee,
      total_paid: totalPaid,
      total_due: totalDue,
      pending_amount: pendingAmount,
      pending_count: pendingCount,
      due_months: dueMonths,
      recent_payments: payments.slice(0, 5),
    };

    res.json({
      data: {
        student: {
          id: student.id,
          student_id_card_no: student.student_id_card_no,
          card_no: student.student_id_card_no,
          batch: student.Batch?.name || null,
          batch_class_link: student.Batch?.class_link || null,
          course: student.Batch?.Course?.title || null,
          admission_date: student.admission_date,
        },
        attendance: {
          total_classes: totalClasses,
          present: presentCount,
          percentage: attendancePercentage,
        },
        payment: paymentBlock,
        payments: paymentBlock,
        upcoming: upcomingEvents,
        upcoming_events: upcomingEvents,
        recent_results: normalizedRecentResults,
      },
    });
  } catch (error) {
    console.error('StudentDashboardController.summary error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard summary' });
  }
};
