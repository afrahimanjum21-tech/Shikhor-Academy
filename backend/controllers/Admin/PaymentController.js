import models from '../../models/index.js';
import { Op } from 'sequelize';
import NotificationService from '../../services/NotificationService.js';

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

const monthKey = (date) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

const buildMonthlyBreakdown = (student, payments, monthlyFee) => {
  const start = student.admission_date ? new Date(student.admission_date) : new Date();
  const end = new Date();
  const paidByMonth = new Map();

  payments.forEach((payment) => {
    const json = payment.toJSON ? payment.toJSON() : payment;
    const key = json.month || (json.date ? monthKey(json.date) : null);
    if (key) paidByMonth.set(key, json);
  });

  const monthly = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= last) {
    const month = monthKey(cursor);
    const payment = paidByMonth.get(month);
    monthly.push({
      month,
      amount: payment?.amount || monthlyFee,
      status: payment?.status || 'due',
      method: payment?.method || null,
      trx_id: payment?.trx_id || null,
      date: payment?.date || null,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return monthly;
};

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
      const term = `%${String(q).trim()}%`;
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

    if (!student_id || !amount) {
      return res.status(400).json({ message: 'student_id and amount are required' });
    }

    const payment = await models.Payment.create({
      student_id,
      month: month || null,
      amount,
      trx_id: trx_id || null,
      method: method || 'cash',
      status: status || 'paid',
      date: date || new Date().toISOString().split('T')[0],
    });

    try {
      const student = await models.Student.findByPk(student_id, { attributes: ['user_id'] });
      if (student?.user_id) {
        await NotificationService.create({
          userId: student.user_id,
          type: 'payment',
          title: 'Payment Recorded',
          body: `A payment of ৳${amount} has been recorded${month ? ` for ${month}` : ''}.`,
          actionUrl: '/student/fees',
          actionLabel: 'View Fees',
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
    const monthlyBreakdown = buildMonthlyBreakdown(student, paymentRows, monthlyFee);
    const dueMonths = monthlyBreakdown.filter(m => m.status !== 'paid').map(m => m.month);
    const pendingPayments = paymentRows.filter(p => p.status === 'pending');
    const totalPaid = paymentRows
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalDue = monthlyBreakdown
      .filter(month => month.status !== 'paid')
      .reduce((sum, month) => sum + parseFloat(month.amount || 0), 0);

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

    const gpas = normalizedResults.map(r => parseFloat(r.gpa)).filter(v => !Number.isNaN(v));
    const summary = {
      total_exams: normalizedResults.length,
      average_gpa: gpas.length ? (gpas.reduce((sum, v) => sum + v, 0) / gpas.length).toFixed(2) : 0,
      highest_gpa: gpas.length ? Math.max(...gpas).toFixed(2) : 0,
      lowest_gpa: gpas.length ? Math.min(...gpas).toFixed(2) : 0,
    };

    return res.json({ student: normalizeUser(student), results: normalizedResults, summary });
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
      const month = monthKey(record.date);
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
  const monthlyBreakdown = buildMonthlyBreakdown(student, paymentRows, courseFee);
  const paidMonths = monthlyBreakdown.filter(m => m.status === 'paid').map(m => m.month);
  const dueMonths = monthlyBreakdown.filter(m => m.status !== 'paid').map(m => m.month);
  const totalPaid = paymentRows
    .filter(payment => payment.status === 'paid')
    .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
  const totalDue = monthlyBreakdown
    .filter(month => month.status !== 'paid')
    .reduce((sum, month) => sum + parseFloat(month.amount || 0), 0);

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
