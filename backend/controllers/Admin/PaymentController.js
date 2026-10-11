import models from '../../models/index.js';
import { Op } from 'sequelize';
import NotificationService from '../../services/NotificationService.js';
import { summarizeFees } from '../../services/feeBreakdown.js';
import { canonicalMonthKey, todayDhaka } from '../../services/paymentMonth.js';
import ExamResultService from '../../services/ExamResultService.js';
import GradeService from '../../services/GradeService.js';

const normalizeUser = (student) => {
  const data = student.toJSON ? student.toJSON() : { ...student };
  data.user = data.user || data.User || null;
  if (data.Batch) {
    data.batch = data.Batch;
    data.batch.course = data.Batch.Course || data.Batch.course || null;
  }
  delete data.User;
  delete data.Batch;
  return data;
};

// monthKey + buildMonthlyBreakdown moved to services/feeBreakdown.js +
// services/paymentMonth.js (single source of truth; canonical month keys).


export const index = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { student_id, month, status, q } = req.query;

    const whereClause = {};
    if (student_id) whereClause.student_id = student_id;
    if (month) whereClause.month = month;
    if (status) whereClause.status = status;

    if (q && String(q).trim()) {
      // H-low5: this is a LITERAL contains-search, so escape the LIKE wildcards
      // (`%` `_`) and the escape char itself — otherwise a user typing "50%"
      // would match everything. Postgres LIKE honours `\` as the escape char by
      // default, so no explicit ESCAPE clause is needed. Still parameterized.
      const escaped = String(q).trim().replace(/[\\%_]/g, '\\$&');
      const term = `%${escaped}%`;
      const [nameMatches, cardMatches] = await Promise.all([
        models.Student.findAll({
          attributes: ['id'],
          include: [{ model: models.User, attributes: [], required: true, where: { name: { [Op.like]: term }, role: 'student' } }],
        }),
        models.Student.findAll({ where: { student_id_card_no: { [Op.like]: term } }, attributes: ['id'] }),
      ]);
      const studentIds = [...new Set([...nameMatches, ...cardMatches].map(s => s.id))];
      whereClause[Op.or] = [
        { student_id: { [Op.in]: studentIds } },
        { trx_id: { [Op.like]: term } },
        { month: { [Op.like]: term } },
      ];
    }

    const { rows, count } = await models.Payment.findAndCountAll({
      where: whereClause,
      // Aliased 'student' (lowercase) so the admin UI can read pay.student.user.name
      include: [{
        model: models.Student,
        as: 'student',
        include: [{ model: models.User, attributes: ['id', 'name', 'email'] }],
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const data = rows.map((payment) => {
      const json = payment.toJSON();
      if (json.student?.User) {
        json.student.user = json.student.User;
        delete json.student.User;
      }
      return json;
    });

    return res.json({
      payments: data,
      current_page: page,
      last_page: Math.ceil(count / limit),
      per_page: limit,
      total: count,
    });
  } catch (error) {
    console.error('PaymentController.index error:', error);
    return res.status(500).json({ message: 'Failed to fetch payments' });
  }
};

export const store = async (req, res) => {
  try {
    const { student_id, month, amount, trx_id, method, status, date } = req.body;
    if (!student_id) return res.status(400).json({ message: 'student_id is required' });
    // Allow partial / advance / ৳0-waiver amounts, but require a finite,
    // non-negative number (never NaN / Infinity / negative / blank).
    const numAmount = Number(amount);
    if (amount === undefined || amount === null || amount === '' || !Number.isFinite(numAmount) || numAmount < 0) {
      return res.status(400).json({ message: 'A valid non-negative amount is required' });
    }
    const student = await models.Student.findByPk(student_id, { attributes: ['id', 'user_id'] });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const canonMonth = month ? canonicalMonthKey(month) : null;
    if (month && !canonMonth) return res.status(400).json({ message: 'Invalid month format' });

    let payment;
    try {
      payment = await models.Payment.create({
        student_id, month: canonMonth, amount: numAmount,
        trx_id: trx_id || null, method: method || 'cash',
        status: status || 'paid', date: date || todayDhaka(),
      });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: `A payment for ${canonMonth || 'this month'} already exists for this student.` });
      }
      throw error;
    }

    try {
      if (student.user_id) {
        await NotificationService.create({
          userId: student.user_id, type: 'payment', title: 'Payment Recorded',
          body: `A payment of ৳${numAmount} has been recorded${canonMonth ? ` for ${canonMonth}` : ''}.`,
          actionUrl: '/student/fees', actionLabel: 'View Fees',
        });
      }
    } catch (notifErr) {
      console.error('Failed to send payment notification:', notifErr);
    }

    return res.status(201).json({ message: 'Payment recorded', data: payment });
  } catch (error) {
    console.error('PaymentController.store error:', error);
    return res.status(500).json({ message: 'Failed to record payment' });
  }
};

export const destroy = async (req, res) => {
  try {
    const payment = await models.Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await payment.destroy();
    return res.json({ message: 'Payment deleted' });
  } catch (error) {
    console.error('PaymentController.destroy error:', error);
    return res.status(500).json({ message: 'Failed to delete payment' });
  }
};

export const studentFinancialStatus = async (req, res) => {
  try {
    const student = await models.Student.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: models.Batch, include: [{ model: models.Course, attributes: ['id', 'title', 'fee'] }] },
      ],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const monthlyFee = parseFloat(student.Batch?.Course?.fee) || 0;

    const paymentHistory = await models.Payment.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
      limit: 50,
    });

    const paymentRows = paymentHistory.map(payment => payment.toJSON());
    const { dueMonths, pendingPayments, totalPaid, totalDue } = summarizeFees(student, paymentRows, monthlyFee);

    if (!student.admission_date || monthlyFee === 0) {
      return res.json({
        data: {
          course_fee: monthlyFee,
          monthlyFee,
          total_paid: totalPaid,
          totalPaid,
          total_due: totalDue,
          totalDue,
          currentDue: totalDue,
          due_months: dueMonths,
          pending_payments: pendingPayments,
          history: paymentRows,
          paymentHistory: paymentRows,
          message: 'No fee structure set or admission date missing',
        },
      });
    }

    return res.json({
      data: {
        course_fee: monthlyFee,
        monthlyFee,
        total_paid: totalPaid,
        totalPaid,
        total_due: totalDue,
        totalDue,
        currentDue: totalDue,
        due_months: dueMonths,
        pending_payments: pendingPayments,
        history: paymentRows,
        paymentHistory: paymentRows,
      },
    });
  } catch (error) {
    console.error('PaymentController.studentFinancialStatus error:', error);
    res.status(500).json({ message: 'Failed to calculate financial status' });
  }
};

export const studentExamResults = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await models.Student.findOne({
      where: { user_id: id },
      include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone'] }],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const results = await models.ExamResult.findAll({
      where: { student_id: student.id },
      include: [{ model: models.Exam, include: [{ model: models.Course, attributes: ['id', 'title'] }] }],
      order: [[{ model: models.Exam }, 'date', 'DESC']],
    });

    const normalizedResults = results.map((result) => {
      const data = result.toJSON();
      data.exam = data.Exam || null;
      if (data.exam?.Course) {
        data.exam.course = data.exam.Course;
        delete data.exam.Course;
      }
      delete data.Exam;
      return data;
    });

    // I-3: show the SAME canonical computed grade/GPA/percentage/position the
    // student sees (admin sees the full, unpublished-inclusive result), instead
    // of possibly-stale stored values. I-15: Pass/Fail from the canonical
    // percentage rule (GradeService), never an absolute-marks >= 33 comparison.
    const enrichedResults = await ExamResultService.enrichResults(normalizedResults);
    enrichedResults.forEach((r) => {
      r.pass_fail = GradeService.passFailStatus(Number(r.percentage) || 0);
    });

    const gpas = enrichedResults.map(r => parseFloat(r.gpa)).filter(v => !Number.isNaN(v));
    const summary = {
      total_exams: enrichedResults.length,
      average_gpa: gpas.length ? (gpas.reduce((sum, v) => sum + v, 0) / gpas.length).toFixed(2) : 0,
      highest_gpa: gpas.length ? Math.max(...gpas).toFixed(2) : 0,
      lowest_gpa: gpas.length ? Math.min(...gpas).toFixed(2) : 0,
    };

    return res.json({ student: normalizeUser(student), results: enrichedResults, summary });
  } catch (error) {
    console.error('PaymentController.studentExamResults error:', error);
    return res.status(500).json({ message: 'Failed to fetch exam results' });
  }
};

export const studentAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await models.Student.findOne({
      where: { user_id: id },
      include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone'] }],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const attendance = await models.Attendance.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
      limit: 60,
    });

    const records = attendance.map(record => record.toJSON());
    const stats = {
      total_classes: records.length,
      present: records.filter(a => a.status === 'present').length,
      absent: records.filter(a => a.status === 'absent').length,
      late: records.filter(a => a.status === 'late').length,
      leave: records.filter(a => a.status === 'leave').length,
    };
    stats.percentage = stats.total_classes > 0 ? Math.round((stats.present / stats.total_classes) * 100) : 0;

    const monthly_stats = {};
    records.forEach((record) => {
      const month = canonicalMonthKey(record.date);
      if (!monthly_stats[month]) {
        monthly_stats[month] = { total: 0, present: 0, percentage: 0 };
      }
      monthly_stats[month].total += 1;
      if (record.status === 'present') monthly_stats[month].present += 1;
      monthly_stats[month].percentage = Math.round((monthly_stats[month].present / monthly_stats[month].total) * 100);
    });

    return res.json({ student: normalizeUser(student), summary: stats, records, monthly_stats });
  } catch (error) {
    console.error('PaymentController.studentAttendance error:', error);
    return res.status(500).json({ message: 'Failed to fetch attendance' });
  }
};

const buildStudentPaymentHistory = (student) => {
  const normalized = normalizeUser(student);
  const payments = student.Payments || [];
  const paymentRows = payments.map(payment => payment.toJSON());
  const courseFee = parseFloat(student.Batch?.Course?.fee || student.batch?.course?.fee || 0);
  const { monthlyBreakdown, paidMonths, dueMonths, totalPaid, totalDue } = summarizeFees(student, paymentRows, courseFee);

  return {
    student: normalized,
    course_fee: courseFee,
    paid_months: paidMonths,
    due_months: dueMonths,
    total_paid: totalPaid,
    total_due: totalDue,
    monthly_breakdown: monthlyBreakdown,
    payments: paymentRows,
  };
};

export const studentPaymentHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await models.Student.findOne({
      where: { user_id: id },
      include: [
        { model: models.User, attributes: ['id', 'name', 'email', 'phone'] },
        { model: models.Batch, include: [{ model: models.Course, attributes: ['id', 'title', 'fee'] }] },
      ],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.Payments = await models.Payment.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
    });

    return res.json(buildStudentPaymentHistory(student));
  } catch (error) {
    console.error('PaymentController.studentPaymentHistory error:', error);
    return res.status(500).json({ message: 'Failed to fetch payment history' });
  }
};

export const studentPaymentHistoryByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await models.Student.findByPk(studentId, {
      include: [
        { model: models.User, attributes: ['id', 'name', 'email', 'phone'] },
        { model: models.Batch, include: [{ model: models.Course, attributes: ['id', 'title', 'fee'] }] },
      ],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.Payments = await models.Payment.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
    });

    return res.json(buildStudentPaymentHistory(student));
  } catch (error) {
    console.error('PaymentController.studentPaymentHistoryByStudentId error:', error);
    return res.status(500).json({ message: 'Failed to fetch payment history' });
  }
};
