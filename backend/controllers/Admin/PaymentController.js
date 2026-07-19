import models from '../../models/index.js';
import { Op, fn, col, literal } from 'sequelize';

export const index = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { student_id, month, status } = req.query;

    const whereClause = {};
    if (student_id) whereClause.student_id = student_id;
    if (month) whereClause.month = month;
    if (status) whereClause.status = status;

    const { rows, count } = await models.Payment.findAndCountAll({
      where: whereClause,
      include: [{ model: models.Student, include: [{ model: models.User, attributes: ['id', 'name', 'email'] }] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('PaymentController.index error:', error);
    return res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
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

    return res.status(201).json({ message: 'Payment recorded', data: payment });
  } catch (error) {
    console.error('PaymentController.store error:', error);
    return res.status(500).json({ message: 'Failed to record payment', error: error.message });
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
    return res.status(500).json({ message: 'Failed to delete payment', error: error.message });
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

    const admissionDate = student.admission_date;
    const monthlyFee = parseFloat(student.Batch?.Course?.fee) || 0;

    if (!admissionDate || monthlyFee === 0) {
      return res.json({
        data: {
          monthlyFee,
          totalDue: 0,
          totalPaid: 0,
          currentDue: 0,
          message: 'No fee structure set or admission date missing',
        },
      });
    }

    const admission = new Date(admissionDate);
    const now = new Date();
    const totalMonths = (now.getFullYear() - admission.getFullYear()) * 12 + (now.getMonth() - admission.getMonth()) + 1;

    const totalDue = totalMonths * monthlyFee;

    const payments = await models.Payment.findAll({
      where: { student_id: student.id, status: 'paid' },
      attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'totalPaid']],
      raw: true,
    });

    const totalPaid = parseFloat(payments[0]?.totalPaid) || 0;
    const currentDue = Math.max(0, totalDue - totalPaid);

    const paymentHistory = await models.Payment.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
      limit: 12,
    });

    return res.json({
      data: {
        monthlyFee,
        totalMonths,
        totalDue,
        totalPaid,
        currentDue,
        paymentHistory,
      },
    });
  } catch (error) {
    console.error('PaymentController.studentFinancialStatus error:', error);
    return res.status(500).json({ message: 'Failed to calculate financial status', error: error.message });
  }
};

export const studentExamResults = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await models.Student.findByPk(id, {
      include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone'] }],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const results = await models.ExamResult.findAll({
      where: { student_id: id },
      include: [{ model: models.Exam }],
      order: [[{ model: models.Exam }, 'date', 'DESC']],
    });

    return res.json({ data: { student, results } });
  } catch (error) {
    console.error('PaymentController.studentExamResults error:', error);
    return res.status(500).json({ message: 'Failed to fetch exam results', error: error.message });
  }
};

export const studentAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await models.Student.findByPk(id, {
      include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone'] }],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const attendance = await models.Attendance.findAll({
      where: { student_id: id },
      order: [['date', 'DESC']],
      limit: 60,
    });

    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      leave: attendance.filter(a => a.status === 'leave').length,
    };

    return res.json({ data: { student, stats, attendance } });
  } catch (error) {
    console.error('PaymentController.studentAttendance error:', error);
    return res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
  }
};

export const studentPaymentHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await models.Student.findByPk(id, {
      include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone'] }],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const payments = await models.Payment.findAll({
      where: { student_id: id },
      order: [['date', 'DESC']],
    });

    return res.json({ data: { student, payments } });
  } catch (error) {
    console.error('PaymentController.studentPaymentHistory error:', error);
    return res.status(500).json({ message: 'Failed to fetch payment history', error: error.message });
  }
};
