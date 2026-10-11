import models from '../../models/index.js';
import { classifyPunch } from '../../services/attendanceIngest.js';

// Accept either { punches: [...] } or a single punch object as the body.
function normalizePunches(body) {
  if (body && Array.isArray(body.punches)) return body.punches;
  if (body && (body.device_user_id || body.user_id)) return [body];
  return [];
}

async function upsertAttendance(student, when) {
  const batch = await models.Batch.findByPk(student.current_batch_id, { attributes: ['id', 'course_id'] });
  const cls = classifyPunch(when);
  if (!cls) return null;
  const where = { student_id: student.id, batch_id: student.current_batch_id, date: cls.date, session: cls.session };

  let created = false;
  let attendance = await models.Attendance.findOne({ where });
  if (!attendance) {
    try {
      attendance = await models.Attendance.create({ ...where, course_id: batch?.course_id || null, status: cls.status, punch_in_at: cls.timeStr });
      created = true;
    } catch (e) {
      // Lost a race to another punch in the same session — fall back to update.
      if (e.name !== 'SequelizeUniqueConstraintError') throw e;
      attendance = await models.Attendance.findOne({ where });
    }
  }
  if (attendance && !created) {
    if (!attendance.punch_in_at || cls.timeStr < attendance.punch_in_at) attendance.punch_in_at = cls.timeStr;
    if (!attendance.punch_out_at || cls.timeStr > attendance.punch_out_at) attendance.punch_out_at = cls.timeStr;
    await attendance.save();
  }
  return { attendance, created };
}

// POST /api/integrations/attendance/punch   (device-key auth)
// Idempotent: the unique (device_id, device_user_id, punched_at) de-duplicates
// re-sent logs, and Attendance is keyed by (student,batch,date,session) so a
// second punch in the same session updates rather than duplicates.
export async function ingest(req, res) {
  try {
    const punches = normalizePunches(req.body);
    if (!punches.length) return res.status(400).json({ message: 'No punches provided' });
    if (punches.length > 1000) return res.status(413).json({ message: 'Too many punches in one request (max 1000)' });

    const summary = { received: punches.length, stored: 0, duplicates: 0, unmapped: 0, created: 0, updated: 0, errors: 0 };

    for (const raw of punches) {
      try {
        const deviceUserId = String(raw.device_user_id ?? raw.user_id ?? '').trim();
        const ts = raw.timestamp ?? raw.time ?? raw.punched_at;
        const deviceId = String(raw.device_id ?? '').trim();
        const direction = raw.direction ? String(raw.direction).toLowerCase().slice(0, 10) : null;
        if (!deviceUserId || !ts) { summary.errors++; continue; }
        const when = new Date(ts);
        if (Number.isNaN(when.getTime())) { summary.errors++; continue; }

        // 1. Store the raw punch (idempotent on the unique index).
        let punch;
        try {
          punch = await models.AttendancePunch.create({ device_id: deviceId, device_user_id: deviceUserId, punched_at: when, direction, status: 'received', raw });
          summary.stored++;
        } catch (e) {
          if (e.name === 'SequelizeUniqueConstraintError') { summary.duplicates++; continue; }
          throw e;
        }

        // 2. Map device id -> student.
        const student = await models.Student.findOne({ where: { device_user_id: deviceUserId } });
        if (!student || !student.current_batch_id) {
          punch.status = 'unmapped';
          if (student) punch.student_id = student.id;
          await punch.save();
          summary.unmapped++;
          continue;
        }

        // 3. Create/update the Attendance row.
        const result = await upsertAttendance(student, when);
        if (!result || !result.attendance) { summary.errors++; continue; }
        if (result.created) summary.created++; else summary.updated++;

        punch.status = 'mapped';
        punch.student_id = student.id;
        punch.attendance_id = result.attendance.id;
        await punch.save();
      } catch (e) {
        console.error('AttendanceDeviceController.ingest punch error:', e.message);
        summary.errors++;
      }
    }

    return res.json({ message: 'Punches processed', data: summary });
  } catch (error) {
    console.error('AttendanceDeviceController.ingest error:', error.message);
    return res.status(500).json({ message: 'Ingestion failed' });
  }
}

// POST /api/integrations/attendance/enroll   (admin) — map a student to the id
// they are enrolled under on the device.
export async function enroll(req, res) {
  try {
    const { student_id, device_user_id } = req.body || {};
    const deviceUserId = String(device_user_id ?? '').trim();
    if (!student_id || !deviceUserId) return res.status(400).json({ message: 'student_id and device_user_id are required' });
    const student = await models.Student.findByPk(student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    student.device_user_id = deviceUserId;
    try {
      await student.save();
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'This device id is already assigned to another student' });
      throw e;
    }
    return res.json({ message: 'Enrolled', data: { student_id: student.id, device_user_id: deviceUserId } });
  } catch (error) {
    console.error('AttendanceDeviceController.enroll error:', error.message);
    return res.status(500).json({ message: 'Enroll failed' });
  }
}

// GET /api/integrations/attendance/punches?status=unmapped   (admin) — review
export async function listPunches(req, res) {
  try {
    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    const punches = await models.AttendancePunch.findAll({ where, order: [['punched_at', 'DESC']], limit: 100 });
    return res.json({ data: punches });
  } catch (error) {
    console.error('AttendanceDeviceController.listPunches error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch punches' });
  }
}
