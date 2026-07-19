import models from '../../models/index.js';
import NotificationService from '../../services/NotificationService.js';
import { Op, fn, col, literal } from 'sequelize';

export const getSheet = async (req, res) => {
  try {
    const { course_id, date, session } = req.query;

    if (!course_id || !date) {
      return res.status(400).json({ message: 'course_id and date are required' });
    }

    const course = await models.Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const students = await models.Student.findAll({
      include: [
        { model: models.User, attributes: ['id', 'name', 'email', 'phone'] },
        { model: models.Batch, attributes: ['id', 'name'] },
      ],
      where: { current_batch_id: { [Op.ne]: null } },
    });

    const whereClause = { date, course_id };
    if (session) whereClause.session = session;

    const attendanceRecords = await models.Attendance.findAll({
      where: whereClause,
    });

    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.student_id] = record;
    });

    const sheet = students.map(student => ({
      student,
      attendance: attendanceMap[student.id] || null,
    }));

    return res.json({ data: { course, date, session: session || null, sheet } });
  } catch (error) {
    console.error('AttendanceController.getSheet error:', error);
    return res.status(500).json({ message: 'Failed to fetch attendance sheet', error: error.message });
  }
};

export const monthlySheet = async (req, res) => {
  try {
    const { course_id, month, year, session } = req.query;

    if (!course_id || !month || !year) {
      return res.status(400).json({ message: 'course_id, month, and year are required' });
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const students = await models.Student.findAll({
      include: [
        { model: models.User, attributes: ['id', 'name', 'email', 'phone'] },
        { model: models.Batch, attributes: ['id', 'name'] },
      ],
      where: { current_batch_id: { [Op.ne]: null } },
    });

    const whereClause = {
      date: { [Op.between]: [startDate, endDate] },
      course_id,
    };
    if (session) whereClause.session = session;

    const attendanceRecords = await models.Attendance.findAll({
      where: whereClause,
      order: [['date', 'ASC']],
    });

    const dates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= new Date(endDate)) {
      const ds = currentDate.toISOString().split('T')[0];
      const day = currentDate.getDay();
      if (day !== 5 && day !== 6) {
        dates.push(ds);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const attendanceByStudent = {};
    attendanceRecords.forEach(record => {
      if (!attendanceByStudent[record.student_id]) {
        attendanceByStudent[record.student_id] = {};
      }
      attendanceByStudent[record.student_id][record.date] = record;
    });

    const sheet = students.map(student => ({
      student,
      days: dates.map(date => ({
        date,
        attendance: attendanceByStudent[student.id]?.[date] || null,
      })),
    }));

    return res.json({ course_id, month, year, dates, sheet });
  } catch (error) {
    console.error('AttendanceController.monthlySheet error:', error);
    return res.status(500).json({ message: 'Failed to fetch monthly sheet', error: error.message });
  }
};

export const store = async (req, res) => {
  try {
    const { course_id, date, session, records } = req.body;

    if (!course_id || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'course_id, date, and records array are required' });
    }

    const attendanceData = records.map(record => ({
      student_id: record.student_id,
      course_id,
      date,
      session: session || null,
      status: record.status || 'present',
    }));

    await models.Attendance.bulkCreate(attendanceData, {
      updateOnDuplicate: ['status', 'session'],
    });

    return res.json({ message: 'Attendance saved successfully', count: attendanceData.length });
  } catch (error) {
    console.error('AttendanceController.store error:', error);
    return res.status(500).json({ message: 'Failed to save attendance', error: error.message });
  }
};

export const saveCell = async (req, res) => {
  try {
    const { student_id, course_id, date, session, status } = req.body;

    if (!student_id || !course_id || !date || !status) {
      return res.status(400).json({ message: 'student_id, course_id, date, and status are required' });
    }

    const [attendance, created] = await models.Attendance.upsert({
      student_id,
      course_id,
      date,
      session: session || null,
      status,
    });

    return res.json({ message: 'Cell updated successfully', data: attendance });
  } catch (error) {
    console.error('AttendanceController.saveCell error:', error);
    return res.status(500).json({ message: 'Failed to update cell', error: error.message });
  }
};

export const leaveRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const whereClause = { leave_status: { [Op.ne]: 'none' } };
    if (status) whereClause.leave_status = status;

    const requests = await models.Attendance.findAll({
      where: whereClause,
      include: [
        { model: models.Student, include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone'] }] },
        { model: models.User, as: 'Approver', attributes: ['id', 'name'] },
      ],
      order: [['leave_requested_at', 'DESC']],
    });

    return res.json({ data: requests });
  } catch (error) {
    console.error('AttendanceController.leaveRequests error:', error);
    return res.status(500).json({ message: 'Failed to fetch leave requests', error: error.message });
  }
};

export const approveLeave = async (req, res) => {
  try {
    const attendance = await models.Attendance.findByPk(req.params.attendance, {
      include: [{ model: models.Student, include: [{ model: models.User, attributes: ['id', 'name', 'email'] }] }],
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    attendance.leave_status = 'approved';
    attendance.leave_approved_at = new Date();
    attendance.leave_approved_by = req.user.id;
    attendance.status = 'leave';
    await attendance.save();

    if (attendance.Student?.User?.email) {
      try {
        await NotificationService.create({
          userId: attendance.Student.User.id,
          type: 'leave',
          title: 'Leave Approved',
          body: `Your leave request for ${attendance.date} has been approved.`,
          actionUrl: '/student/attendance',
          actionLabel: 'View Attendance',
        });
      } catch (notifErr) {
        console.error('Failed to send leave approval notification:', notifErr);
      }
    }

    return res.json({ message: 'Leave approved successfully', data: attendance });
  } catch (error) {
    console.error('AttendanceController.approveLeave error:', error);
    return res.status(500).json({ message: 'Failed to approve leave', error: error.message });
  }
};

export const rejectLeave = async (req, res) => {
  try {
    const attendance = await models.Attendance.findByPk(req.params.attendance, {
      include: [{ model: models.Student, include: [{ model: models.User, attributes: ['id', 'name', 'email'] }] }],
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    attendance.leave_status = 'rejected';
    attendance.leave_approved_at = new Date();
    attendance.leave_approved_by = req.user.id;
    await attendance.save();

    if (attendance.Student?.User?.email) {
      try {
        await NotificationService.create({
          userId: attendance.Student.User.id,
          type: 'leave',
          title: 'Leave Rejected',
          body: `Your leave request for ${attendance.date} has been rejected.`,
          actionUrl: '/student/attendance',
          actionLabel: 'View Attendance',
        });
      } catch (notifErr) {
        console.error('Failed to send leave rejection notification:', notifErr);
      }
    }

    return res.json({ message: 'Leave rejected', data: attendance });
  } catch (error) {
    console.error('AttendanceController.rejectLeave error:', error);
    return res.status(500).json({ message: 'Failed to reject leave', error: error.message });
  }
};

export const reviewLeave = async (req, res) => {
  try {
    const attendance = await models.Attendance.findByPk(req.params.attendance, {
      include: [{ model: models.Student, include: [{ model: models.User, attributes: ['id', 'name', 'email'] }] }],
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    attendance.leave_status = 'approved';
    attendance.leave_approved_at = new Date();
    attendance.leave_approved_by = req.user.id;
    attendance.status = 'leave';
    await attendance.save();

    if (attendance.Student?.User?.email) {
      try {
        await NotificationService.create({
          userId: attendance.Student.User.id,
          type: 'leave',
          title: 'Leave Reviewed & Approved',
          body: `Your leave request for ${attendance.date} has been reviewed and approved.`,
          actionUrl: '/student/attendance',
          actionLabel: 'View Attendance',
        });
      } catch (notifErr) {
        console.error('Failed to send leave review notification:', notifErr);
      }
    }

    return res.json({ message: 'Leave reviewed and approved', data: attendance });
  } catch (error) {
    console.error('AttendanceController.reviewLeave error:', error);
    return res.status(500).json({ message: 'Failed to review leave', error: error.message });
  }
};

export const studentStats = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const totalClasses = await models.Attendance.count({ where: { student_id: student.id } });
    const presentCount = await models.Attendance.count({ where: { student_id: student.id, status: 'present' } });
    const absentCount = await models.Attendance.count({ where: { student_id: student.id, status: 'absent' } });
    const leaveCount = await models.Attendance.count({ where: { student_id: student.id, status: 'leave', leave_status: 'approved' } });
    const pendingLeave = await models.Attendance.count({ where: { student_id: student.id, leave_status: 'pending' } });

    const attendancePercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

    const recentAttendance = await models.Attendance.findAll({
      where: { student_id: student.id },
      order: [['date', 'DESC']],
      limit: 30,
    });

    return res.json({
      data: {
        totalClasses,
        presentCount,
        absentCount,
        leaveCount,
        pendingLeave,
        attendancePercentage,
        recentAttendance,
      },
    });
  } catch (error) {
    console.error('AttendanceController.studentStats error:', error);
    return res.status(500).json({ message: 'Failed to fetch attendance stats', error: error.message });
  }
};

export const requestLeave = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { date, reason, course_id, session } = req.body;

    if (!date || !reason) {
      return res.status(400).json({ message: 'date and reason are required' });
    }

    const [attendance, created] = await models.Attendance.upsert({
      student_id: student.id,
      course_id: course_id || null,
      date,
      session: session || null,
      status: 'leave',
      leave_status: 'pending',
      leave_reason: reason,
      leave_requested_at: new Date(),
    });

    return res.status(201).json({ message: 'Leave request submitted', data: attendance });
  } catch (error) {
    console.error('AttendanceController.requestLeave error:', error);
    return res.status(500).json({ message: 'Failed to submit leave request', error: error.message });
  }
};

export const punchIn = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { course_id, date, session } = req.body;
    const today = date || new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];

    const [attendance, created] = await models.Attendance.upsert({
      student_id: student.id,
      course_id: course_id || null,
      date: today,
      session: session || null,
      status: 'present',
      punch_in_at: now,
    });

    return res.json({ message: 'Punched in successfully', data: attendance });
  } catch (error) {
    console.error('AttendanceController.punchIn error:', error);
    return res.status(500).json({ message: 'Failed to punch in', error: error.message });
  }
};

export const punchOut = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { date } = req.body;
    const today = date || new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0];

    const attendance = await models.Attendance.findOne({
      where: { student_id: student.id, date: today },
    });

    if (!attendance) {
      return res.status(404).json({ message: 'No punch-in record found for today' });
    }

    attendance.punch_out_at = now;
    await attendance.save();

    return res.json({ message: 'Punched out successfully', data: attendance });
  } catch (error) {
    console.error('AttendanceController.punchOut error:', error);
    return res.status(500).json({ message: 'Failed to punch out', error: error.message });
  }
};
