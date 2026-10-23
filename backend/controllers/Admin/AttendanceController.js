import models from '../../models/index.js';
import NotificationService from '../../services/NotificationService.js';
import { Op, fn, col } from 'sequelize';
import { resolveSession, dhakaTime, todayLocalDate } from '../../services/attendanceSession.js';
import { attendanceSummary } from '../../services/attendanceStats.js';
import { serializeLeaveRequests } from '../../services/leaveSerializer.js';
import {
  listEligibleStudents,
  saveManualAttendance,
  ManualAttendanceError,
} from '../../services/attendance/ManualAttendanceService.js';

// Resolve each student's current batch so attendance rows always carry the
// batch_id that models/Attendance.js's unique index (student_id, batch_id,
// date, session) needs to make upserts/updateOnDuplicate actually match.
const resolveBatchMap = async (studentIds) => {
  const uniqueIds = [...new Set(studentIds)].filter(Boolean);
  if (uniqueIds.length === 0) return {};
  const students = await models.Student.findAll({
    where: { id: { [Op.in]: uniqueIds } },
    attributes: ['id', 'current_batch_id'],
  });
  const map = {};
  students.forEach(s => { map[s.id] = s.current_batch_id || null; });
  return map;
};

// The batch ids that belong to a course — the basis for scoping the daily/
// monthly sheet to the selected course and for rejecting cross-course writes.
const courseBatchIds = async (courseId) => {
  const batches = await models.Batch.findAll({ where: { course_id: courseId }, attributes: ['id'] });
  return batches.map(b => b.id);
};

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

    // C1: the daily sheet must list only students enrolled in THIS course's
    // batches (previously it listed every student in the school with a batch).
    const batchIds = await courseBatchIds(course_id);
    const students = batchIds.length
      ? await models.Student.findAll({
          include: [
            { model: models.User, attributes: ['id', 'name', 'email', 'phone'] },
            { model: models.Batch, attributes: ['id', 'name'] },
          ],
          where: { current_batch_id: { [Op.in]: batchIds } },
        })
      : [];

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
    return res.status(500).json({ message: 'Failed to fetch attendance sheet' });
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

    const batches = await models.Batch.findAll({ where: { course_id }, attributes: ['id'] });
    const batchIds = batches.map(b => b.id);

    const students = batchIds.length
      ? await models.Student.findAll({
          include: [
            { model: models.User, attributes: ['id', 'name', 'email', 'phone'] },
            { model: models.Batch, attributes: ['id', 'name'] },
          ],
          where: { current_batch_id: { [Op.in]: batchIds } },
        })
      : [];

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
      if (!attendanceByStudent[record.student_id][record.date]) {
        attendanceByStudent[record.student_id][record.date] = {};
      }
      attendanceByStudent[record.student_id][record.date][record.session] = record;
    });

    const sheet = students.map(student => ({
      student: {
        id: student.id,
        name: student.User?.name || 'Unknown',
        card_no: student.student_id_card_no || '',
      },
      days: dates.map(date => ({
        date,
        morning: attendanceByStudent[student.id]?.[date]?.morning || null,
        evening: attendanceByStudent[student.id]?.[date]?.evening || null,
      })),
    }));

    return res.json({ course_id, month, year, dates, sheet });
  } catch (error) {
    console.error('AttendanceController.monthlySheet error:', error);
    return res.status(500).json({ message: 'Failed to fetch monthly sheet' });
  }
};

export const store = async (req, res) => {
  try {
    const { course_id, date, session, records } = req.body;

    if (!course_id || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'course_id, date, and records array are required' });
    }

    const batchMap = await resolveBatchMap(records.map(r => r.student_id));
    const allowedBatchIds = new Set(await courseBatchIds(course_id));

    // C1: reject writes for students who are not enrolled in a batch of the
    // selected course (dropdown filtering is not an authorization boundary).
    const offenders = records.filter(r => {
      const bid = batchMap[r.student_id];
      return !bid || !allowedBatchIds.has(bid);
    });
    if (offenders.length > 0) {
      return res.status(400).json({
        message: 'Some students do not belong to the selected course',
        student_ids: offenders.map(r => r.student_id),
      });
    }

    const resolvedSession = resolveSession(session);
    const attendanceData = records.map(record => ({
      student_id: record.student_id,
      course_id,
      batch_id: batchMap[record.student_id],
      date,
      session: resolvedSession,
      status: record.status || 'present',
    }));

    await models.Attendance.bulkCreate(attendanceData, {
      updateOnDuplicate: ['status', 'session'],
    });

    try {
      const grouped = attendanceData.reduce((groups, record) => {
        const key = record.status === 'late' ? 'late' : record.status === 'absent' ? 'absent' : 'present';
        if (!groups[key]) groups[key] = [];
        groups[key].push(record.student_id);
        return groups;
      }, {});
      const messages = {
        present: ['Attendance Marked Present', 'Your attendance was marked present'],
        absent: ['Attendance Marked Absent', 'Your attendance was marked absent'],
        late: ['Attendance Marked Late', 'Your attendance was marked late'],
      };
      await Promise.all(Object.entries(grouped).map(([status, studentIds]) => {
        const [title, body] = messages[status];
        return NotificationService.createForStudents({
          userIds: studentIds,
          type: status === 'late' ? 'late' : 'attendance',
          title,
          body: `${body} for ${date}.`,
          actionUrl: '/student/attendance-report',
          actionLabel: 'View Attendance',
        });
      }));
    } catch (notifErr) {
      console.error('Failed to notify students about attendance:', notifErr);
    }

    return res.json({ message: 'Attendance saved successfully', count: attendanceData.length });
  } catch (error) {
    console.error('AttendanceController.store error:', error);
    return res.status(500).json({ message: 'Failed to save attendance' });
  }
};

export const saveCell = async (req, res) => {
  try {
    const { student_id, course_id, date, session, status, punch_in_at, punch_out_at } = req.body;

    if (!student_id || !course_id || !date || !status) {
      return res.status(400).json({ message: 'student_id, course_id, date, and status are required' });
    }

    const batchMap = await resolveBatchMap([student_id]);
    const studentBatchId = batchMap[student_id];

    // C1: the student must belong to a batch of the selected course.
    const allowedBatchIds = new Set(await courseBatchIds(course_id));
    if (!studentBatchId || !allowedBatchIds.has(studentBatchId)) {
      return res.status(400).json({ message: 'This student does not belong to the selected course' });
    }

    const previousStatus = (await models.Attendance.findOne({
      where: { student_id, date, session: resolveSession(session) },
      attributes: ['status'],
    }))?.status;
    const [attendance] = await models.Attendance.upsert({
      student_id,
      course_id,
      batch_id: studentBatchId,
      date,
      session: resolveSession(session),
      status,
      punch_in_at: punch_in_at || null,
      punch_out_at: punch_out_at || null,
    });

    if (previousStatus !== status) {
      try {
        const student = await models.Student.findByPk(student_id, { attributes: ['user_id'] });
        await NotificationService.create({
          userId: student?.user_id,
          type: status === 'late' ? 'late' : 'attendance',
          title: `Attendance Marked ${status.charAt(0).toUpperCase()}${status.slice(1)}`,
          body: `Your attendance was marked ${status} for ${date}.`,
          actionUrl: '/student/attendance-report',
          actionLabel: 'View Attendance',
        });
      } catch (notifErr) {
        console.error('Failed to notify student about attendance:', notifErr);
      }
    }

    return res.json({ message: 'Cell updated successfully', data: attendance });
  } catch (error) {
    console.error('AttendanceController.saveCell error:', error);
    return res.status(500).json({ message: 'Failed to update cell' });
  }
};

const manualErrorResponse = (res, error, fallback) => {
  const known = error instanceof ManualAttendanceError;
  if (!known) console.error(`${fallback}:`, error.message);
  return res.status(known ? error.statusCode : 500).json({
    message: known ? error.message : fallback,
  });
};

export const manualSheet = async (req, res) => {
  try {
    const { course_id, batch_id, date, session } = req.query;
    if (!course_id || !batch_id || !date) {
      return res.status(400).json({ message: 'course_id, batch_id, and date are required' });
    }

    const data = await listEligibleStudents({
      batchId: batch_id,
      courseId: course_id,
      date,
      session,
    });
    return res.json({ data });
  } catch (error) {
    return manualErrorResponse(res, error, 'Failed to fetch manual attendance sheet');
  }
};

export const manualSave = async (req, res) => {
  try {
    const { student_id, batch_id, course_id, date, session, status } = req.body || {};
    if (!student_id || !batch_id || !course_id || !date || !status) {
      return res.status(400).json({
        message: 'student_id, batch_id, course_id, date, and status are required',
      });
    }

    const data = await saveManualAttendance({
      batchId: batch_id,
      courseId: course_id,
      studentId: student_id,
      date,
      session,
      status,
    });

    return res.json({ message: 'Attendance saved successfully', data });
  } catch (error) {
    return manualErrorResponse(res, error, 'Failed to save attendance');
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

    // B4: normalize to the lowercase `student.user` shape the admin UI reads.
    return res.json({ data: serializeLeaveRequests(requests) });
  } catch (error) {
    console.error('AttendanceController.leaveRequests error:', error);
    return res.status(500).json({ message: 'Failed to fetch leave requests' });
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
          actionUrl: '/student/attendance-report',
          actionLabel: 'View Attendance',
        });
      } catch (notifErr) {
        console.error('Failed to send leave approval notification:', notifErr);
      }
    }

    return res.json({ message: 'Leave approved successfully', data: attendance });
  } catch (error) {
    console.error('AttendanceController.approveLeave error:', error);
    return res.status(500).json({ message: 'Failed to approve leave' });
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
          actionUrl: '/student/attendance-report',
          actionLabel: 'View Attendance',
        });
      } catch (notifErr) {
        console.error('Failed to send leave rejection notification:', notifErr);
      }
    }

    return res.json({ message: 'Leave rejected', data: attendance });
  } catch (error) {
    console.error('AttendanceController.rejectLeave error:', error);
    return res.status(500).json({ message: 'Failed to reject leave' });
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
          actionUrl: '/student/attendance-report',
          actionLabel: 'View Attendance',
        });
      } catch (notifErr) {
        console.error('Failed to send leave review notification:', notifErr);
      }
    }

    return res.json({ message: 'Leave reviewed and approved', data: attendance });
  } catch (error) {
    console.error('AttendanceController.reviewLeave error:', error);
    return res.status(500).json({ message: 'Failed to review leave' });
  }
};

export const studentStats = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Previously seven sequential queries (~2.4s on this stack); now a single
    // grouped count plus the recent list and pending-leave count in parallel.
    const [statusRows, recentAttendance, pendingLeave] = await Promise.all([
      models.Attendance.findAll({
        where: { student_id: student.id },
        attributes: ['status', [fn('COUNT', col('id')), 'cnt']],
        group: ['status'],
      }),
      models.Attendance.findAll({
        where: { student_id: student.id },
        order: [['date', 'DESC']],
        limit: 30,
      }),
      models.Attendance.count({ where: { student_id: student.id, leave_status: 'pending' } }),
    ]);

    const counts = { present: 0, absent: 0, late: 0 };
    statusRows.forEach(row => {
      const n = parseInt(row.get('cnt'), 10) || 0;
      if (counts[row.status] !== undefined) counts[row.status] = n;
    });
    // I-19: eligible days = present + absent + late + APPROVED leave. Pending
    // and rejected leave are EXCLUDED from the denominator (they are not
    // decided/eligible classes), so they no longer deflate the percentage.
    const approvedLeave = await models.Attendance.count({
      where: { student_id: student.id, status: 'leave', leave_status: 'approved' },
    });
    const summary = attendanceSummary({ ...counts, approvedLeave });

    return res.json({
      total: summary.eligibleDays,
      present: counts.present,
      absent: counts.absent,
      late: counts.late,
      leave: approvedLeave,
      pending_leave: pendingLeave,
      percentage: summary.percentage,
      recent_attendance: recentAttendance,
    });
  } catch (error) {
    console.error('AttendanceController.studentStats error:', error);
    return res.status(500).json({ message: 'Failed to fetch attendance stats' });
  }
};

export const requestLeave = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { date, reason, course_id, session, punch_out_at } = req.body;

    if (!date || !reason) {
      return res.status(400).json({ message: 'date and reason are required' });
    }

    // Leave can be requested for today or a future class — never the past.
    if (String(date) < todayLocalDate()) {
      return res.status(400).json({ message: 'Leave cannot be requested for a past date' });
    }

    const resolvedSession = resolveSession(session);

    // C4: never overwrite an attendance row a teacher already marked. Only an
    // empty slot or the student's OWN still-pending leave may be (re)written.
    const existing = await models.Attendance.findOne({
      where: { student_id: student.id, date, session: resolvedSession },
    });
    if (existing) {
      if (existing.leave_status === 'approved') {
        return res.status(409).json({ message: 'Your leave for this class is already approved.' });
      }
      const teacherMarked = ['present', 'absent', 'late'].includes(existing.status) || !!existing.punch_in_at;
      if (teacherMarked) {
        return res.status(409).json({
          message: 'Attendance for this class was already marked by your teacher — contact the office to request a change.',
        });
      }
      // Otherwise it is a prior pending/none leave slot owned by the student:
      // refresh the reason and re-open it as pending below.
    }

    const [attendance, created] = await models.Attendance.upsert({
      student_id: student.id,
      course_id: course_id || existing?.course_id || null,
      batch_id: student.current_batch_id || null,
      date,
      session: resolvedSession,
      status: 'leave',
      leave_status: 'pending',
      leave_reason: reason,
      punch_out_at: punch_out_at || null,
      leave_requested_at: new Date(),
    });

    try {
      await NotificationService.createForAdmins({
        type: 'leave',
        title: 'New Leave Request',
        body: `Leave request for ${date}: ${reason}`,
        actionUrl: '/admin/attendance/leave-requests',
        actionLabel: 'Review Leave',
      });
      await NotificationService.create({
        userId: req.user.id,
        type: 'leave',
        title: 'Leave Request Submitted',
        body: `Your leave request for ${date} has been submitted for review.`,
        actionUrl: '/student/attendance-report',
        actionLabel: 'View Attendance',
      });
    } catch (notifErr) {
      console.error('Failed to notify admins of leave request:', notifErr);
    }

    return res.status(201).json({ message: 'Leave request submitted', data: attendance });
  } catch (error) {
    console.error('AttendanceController.requestLeave error:', error);
    return res.status(500).json({ message: 'Failed to submit leave request' });
  }
};

export const punchIn = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { course_id, date, session } = req.body;
    const today = date || todayLocalDate();

    // A punch-in can only be recorded for the current local day — students
    // must not be able to fabricate attendance for other dates.
    if (today !== todayLocalDate()) {
      return res.status(400).json({ message: 'Punch-in is only allowed for today' });
    }
    const now = dhakaTime();
    const resolvedSession = resolveSession(session);

    // Never let a student punch-in overwrite a teacher-marked row or a
    // leave request (the unique key student_id/batch_id/date/session would
    // otherwise silently destroy that record).
    const existing = await models.Attendance.findOne({
      where: { student_id: student.id, date: today, session: resolvedSession },
    });
    if (existing) {
      if (existing.leave_status === 'pending' || existing.leave_status === 'approved') {
        return res.status(400).json({ message: 'You have a leave request for this class — punch-in is not allowed.' });
      }
      if (existing.status !== 'present' || !existing.punch_in_at) {
        return res.status(400).json({
          message: `Attendance for this class was already marked as ${existing.status} by your teacher. Contact the office to correct it.`,
        });
      }
      return res.status(400).json({ message: 'You have already punched in for this class.' });
    }

    const [attendance, created] = await models.Attendance.upsert({
      student_id: student.id,
      course_id: course_id || null,
      batch_id: student.current_batch_id || null,
      date: today,
      session: resolvedSession,
      status: 'present',
      punch_in_at: now,
    });

    return res.json({ message: 'Punched in successfully', data: attendance });
  } catch (error) {
    console.error('AttendanceController.punchIn error:', error);
    return res.status(500).json({ message: 'Failed to punch in' });
  }
};

export const punchOut = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { date, session, course_id } = req.body;
    const today = date || todayLocalDate();

    // Punch-out must target today's record only.
    if (today !== todayLocalDate()) {
      return res.status(400).json({ message: 'Punch-out is only allowed for today' });
    }
    const now = dhakaTime();

    // C5: punch-out must find the row of the corresponding PUNCH-IN, not derive
    // a fresh session from the current clock (a morning punch-in followed by an
    // afternoon punch-out would otherwise resolve to 'evening' and find
    // nothing). Match today's record that actually has a punch-in; prefer the
    // one still open (no punch-out yet). An explicit session still narrows it.
    const base = { student_id: student.id, date: today, punch_in_at: { [Op.ne]: null } };
    if (session === 'morning' || session === 'evening') base.session = session;
    if (course_id) base.course_id = course_id;

    let attendance = await models.Attendance.findOne({
      where: { ...base, punch_out_at: null },
      order: [['punch_in_at', 'DESC']],
    });
    if (!attendance) {
      attendance = await models.Attendance.findOne({ where: base, order: [['punch_in_at', 'DESC']] });
    }

    if (!attendance || !attendance.punch_in_at) {
      return res.status(404).json({ message: 'No punch-in record found for today' });
    }

    attendance.punch_out_at = now;
    await attendance.save();

    return res.json({ message: 'Punched out successfully', data: attendance });
  } catch (error) {
    console.error('AttendanceController.punchOut error:', error);
    res.status(500).json({ message: 'Failed to punch out' });
  }
};
