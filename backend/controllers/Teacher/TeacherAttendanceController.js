import models from '../../models/index.js';
import { Op } from 'sequelize';
import { resolveSession } from '../../services/attendanceSession.js';
import {
  listEligibleStudents,
  saveManualAttendance,
  ManualAttendanceError,
} from '../../services/attendance/ManualAttendanceService.js';

export const index = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batch_id, date, session } = req.query;

    const batchIds = await models.TeacherBatchAssignment.findAll({
      where: { teacher_id: teacherId },
      attributes: ['batch_id'],
    }).then(rows => rows.map(r => r.batch_id));

    // A batch filter is only honoured when the teacher is actually assigned to
    // that batch - otherwise the query silently returns nothing.
    const whereBatch = { id: { [Op.in]: batchIds } };
    if (batch_id) whereBatch.id = { [Op.in]: batchIds, [Op.eq]: Number(batch_id) };

    const batches = await models.Batch.findAll({
      where: whereBatch,
      include: [{ model: models.Course, attributes: ['id', 'title'] }],
    });

    const queriedBatchIds = batches.map(b => b.id);

    // Previously three sequential queries; students and attendance records now
    // run in parallel (records matched by an include-filtered subselect, then
    // the optional date/session filter applied in memory).
    const [students, records] = queriedBatchIds.length > 0 ? await Promise.all([
      models.Student.findAll({
        where: { current_batch_id: { [Op.in]: queriedBatchIds } },
        include: [{
          model: models.User,
          attributes: ['id', 'name', 'email', 'phone', 'profile_photo_path'],
          where: { role: 'student', is_active: true },
          required: true,
        }],
      }),
      models.Attendance.findAll({
        where: {
          '$Student.current_batch_id$': { [Op.in]: queriedBatchIds },
        },
        include: [{ model: models.Student, attributes: [] }],
      }),
    ]) : [[], []];

    const filteredRecords = records.filter(r =>
      (!date || r.date === date) && (!session || r.session === session)
    );

    const recordMap = {};
    filteredRecords.forEach(r => { recordMap[r.student_id] = r; });

    const studentByBatch = {};
    students.forEach(s => {
      const bid = s.current_batch_id;
      if (!studentByBatch[bid]) studentByBatch[bid] = [];
      studentByBatch[bid].push(s);
    });

    const result = batches.map((batch) => {
      const batchStudents = studentByBatch[batch.id] || [];
      const sheet = batchStudents.map(student => ({
        student,
        attendance: recordMap[student.id] || null,
      }));
      return { batch, sheet };
    });

    res.json({ data: result });
  } catch (error) {
    console.error('TeacherAttendanceController.index error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
};

export const getStudentsForAttendance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batchId } = req.params;
    const { date, session } = req.query;

    const assignment = await models.TeacherBatchAssignment.findOne({
      where: { teacher_id: teacherId, batch_id: batchId },
    });

    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this batch' });
    }

    const batch = await models.Batch.findByPk(batchId, {
      include: [{ model: models.Course, attributes: ['id', 'title'] }],
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const students = await models.Student.findAll({
      where: { current_batch_id: batchId },
      include: [{
        model: models.User,
        attributes: ['id', 'name', 'email', 'phone', 'profile_photo_path'],
        where: { role: 'student', is_active: true },
        required: true,
      }],
      order: [['admission_date', 'ASC']],
    });

    const attendanceWhere = { student_id: { [Op.in]: students.map(s => s.id) } };
    if (date) attendanceWhere.date = date;
    if (session) attendanceWhere.session = session;
    const records = students.length > 0 ? await models.Attendance.findAll({ where: attendanceWhere }) : [];
    const recordMap = {};
    records.forEach(r => { recordMap[r.student_id] = r; });

    const list = students.map(student => ({
      student,
      attendance: recordMap[student.id] || null,
    }));

    res.json({ data: { batch, students: list } });
  } catch (error) {
    console.error('TeacherAttendanceController.getStudentsForAttendance error:', error);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
};

const manualErrorResponse = (res, error, fallback) => {
  const known = error instanceof ManualAttendanceError;
  if (!known) console.error(`${fallback}:`, error.message);
  return res.status(known ? error.statusCode : 500).json({
    message: known ? error.message : fallback,
  });
};

const positiveId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const manualSheet = async (req, res) => {
  try {
    const { batch_id, date, session } = req.query;
    if (!batch_id || !date) {
      return res.status(400).json({ message: 'batch_id and date are required' });
    }

    // Validate before the assignment lookup: passing a non-integer to an
    // integer FK would otherwise become a database error (500).
    const batchId = positiveId(batch_id);
    if (!batchId) {
      return res.status(400).json({ message: 'A valid batch is required' });
    }

    const assignment = await models.TeacherBatchAssignment.findOne({
      where: { teacher_id: req.user.id, batch_id: batchId },
    });
    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this batch' });
    }

    const data = await listEligibleStudents({ batchId, date, session });
    return res.json({ data });
  } catch (error) {
    return manualErrorResponse(res, error, 'Failed to fetch manual attendance sheet');
  }
};

export const manualSave = async (req, res) => {
  try {
    const { student_id, batch_id, date, session, status } = req.body || {};
    if (!student_id || !batch_id || !date || !status) {
      return res.status(400).json({
        message: 'student_id, batch_id, date, and status are required',
      });
    }

    const batchId = positiveId(batch_id);
    if (!batchId) {
      return res.status(400).json({ message: 'A valid batch is required' });
    }

    const assignment = await models.TeacherBatchAssignment.findOne({
      where: { teacher_id: req.user.id, batch_id: batchId },
    });
    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this batch' });
    }

    const data = await saveManualAttendance({
      batchId,
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

export const markAttendance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batch_id, date, session, records } = req.body;

    if (!batch_id || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'batch_id, date, and records array are required' });
    }

    const assignment = await models.TeacherBatchAssignment.findOne({
      where: { teacher_id: teacherId, batch_id },
    });

    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this batch' });
    }

    // C2/I-2: derive course_id from the validated batch (never trust a
    // client-supplied course id) so teacher-marked rows appear in the admin
    // monthly sheet (which filters by course_id). C3: resolve a NON-NULL
    // session with the SAME rule the admin path uses, so the unique index
    // (student_id, batch_id, date, session) actually prevents duplicates.
    const batch = await models.Batch.findByPk(batch_id, { attributes: ['id', 'course_id'] });
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    const resolvedSession = resolveSession(session);

    const attendanceData = records.map(record => ({
      student_id: record.student_id,
      batch_id,
      course_id: batch.course_id || null,
      date,
      session: resolvedSession,
      status: record.status || 'present',
    }));

    // Reject records that reference students outside the teacher's batch -
    // otherwise a teacher could mark attendance for (or impersonate marks of)
    // any student in the school.
    const studentIds = [...new Set(attendanceData.map(r => r.student_id))];
    const validStudents = await models.Student.findAll({
      where: { id: { [Op.in]: studentIds }, current_batch_id: batch_id },
      attributes: ['id'],
    });
    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({ message: 'Some students are not in your assigned batch' });
    }

    await models.Attendance.bulkCreate(attendanceData, {
      updateOnDuplicate: ['status', 'session', 'course_id'],
    });

    res.json({ message: 'Attendance marked successfully', count: attendanceData.length });
  } catch (error) {
    console.error('TeacherAttendanceController.markAttendance error:', error);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { attendanceId } = req.params;
    const { status, session } = req.body;

    const attendance = await models.Attendance.findByPk(attendanceId, {
      include: [{ model: models.Student, attributes: ['id', 'current_batch_id'] }],
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    const assignment = await models.TeacherBatchAssignment.findOne({
      where: { teacher_id: teacherId, batch_id: attendance.Student?.current_batch_id },
    });

    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this student\'s batch' });
    }

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (session !== undefined) updates.session = resolveSession(session);

    await attendance.update(updates);

    res.json({ message: 'Attendance updated successfully', data: attendance });
  } catch (error) {
    console.error('TeacherAttendanceController.updateAttendance error:', error);
    res.status(500).json({ message: 'Failed to update attendance' });
  }
};
