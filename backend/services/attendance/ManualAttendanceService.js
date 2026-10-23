import models from '../../models/index.js';
import { Op } from 'sequelize';
import { resolveSession } from '../attendanceSession.js';
import {
  buildAttendanceMessage,
  buildWhatsAppUrl,
  maskWhatsAppNumber,
  resolveGuardianPhone,
} from './WhatsAppNotification.js';

// Manual attendance is the effective status stored on Attendance. The raw
// biometric event log (AttendancePunch) is deliberately never touched here:
// a teacher's correction updates only Attendance.status, so an original punch
// remains available if the two sources are combined in a future release.

export class ManualAttendanceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ManualAttendanceError';
    this.statusCode = statusCode;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeAttendanceDate = (value) => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return value;
};

export const normalizeManualStatus = (value) => {
  const status = String(value || '').trim().toLowerCase();
  return ['present', 'absent'].includes(status) ? status : null;
};

export const normalizeManualSession = (value) => {
  if (value === undefined || value === null || value === '') return resolveSession();
  if (value === 'morning' || value === 'evening') return value;
  return null;
};

const positiveId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const batchJson = (batch) => ({
  id: batch.id,
  name: batch.name,
  course_id: batch.course_id || null,
  course_title: batch.Course?.title || null,
});

const loadBatch = async ({ batchId, courseId }) => {
  const id = positiveId(batchId);
  if (!id) throw new ManualAttendanceError('A valid batch is required');

  const batch = await models.Batch.findByPk(id, {
    attributes: ['id', 'name', 'course_id'],
    include: [{ model: models.Course, attributes: ['id', 'title'] }],
  });
  if (!batch) throw new ManualAttendanceError('Batch not found', 404);

  if (courseId !== undefined && courseId !== null && courseId !== '') {
    if (Number(courseId) !== Number(batch.course_id)) {
      throw new ManualAttendanceError('The selected batch does not belong to the selected class');
    }
  }

  return batch;
};

const studentAttributes = [
  'id',
  'user_id',
  'student_id_card_no',
  'guardian_phone',
  'father_phone',
  'mother_phone',
  'admission_date',
];

const studentInclude = [{
  model: models.User,
  attributes: ['id', 'name'],
  where: { role: 'student', is_active: true },
  required: true,
}];

const studentJson = (student) => ({
  id: student.id,
  user_id: student.user_id,
  name: student.User?.name || 'Student',
  student_id_card_no: student.student_id_card_no || null,
});

const attendanceJson = (attendance) => (attendance ? {
  id: attendance.id,
  date: attendance.date,
  session: attendance.session,
  status: attendance.status,
} : null);

export const listEligibleStudents = async ({ batchId, courseId, date, session }) => {
  const normalizedDate = normalizeAttendanceDate(date);
  if (!normalizedDate) throw new ManualAttendanceError('A valid attendance date is required');

  const normalizedSession = normalizeManualSession(session);
  if (!normalizedSession) throw new ManualAttendanceError('Session must be morning or evening');

  const batch = await loadBatch({ batchId, courseId });

  const students = await models.Student.findAll({
    where: { current_batch_id: batch.id },
    attributes: studentAttributes,
    include: studentInclude,
    order: [['admission_date', 'ASC'], ['id', 'ASC']],
  });

  const studentIds = students.map((student) => student.id);
  const records = studentIds.length
    ? await models.Attendance.findAll({
        where: {
          student_id: { [Op.in]: studentIds },
          batch_id: batch.id,
          date: normalizedDate,
          session: normalizedSession,
        },
        attributes: ['id', 'student_id', 'date', 'session', 'status'],
      })
    : [];

  const recordMap = {};
  records.forEach((record) => {
    recordMap[record.student_id] = record;
  });

  return {
    batch: batchJson(batch),
    date: normalizedDate,
    session: normalizedSession,
    students: students.map((student) => {
      const guardian = resolveGuardianPhone(student);
      return {
        ...studentJson(student),
        guardian_available: Boolean(guardian),
        guardian_masked: guardian ? maskWhatsAppNumber(guardian.number) : null,
        guardian_source: guardian?.field || null,
        guardian_source_label: guardian?.label || null,
        attendance: attendanceJson(recordMap[student.id]),
      };
    }),
  };
};

export const saveManualAttendance = async ({
  batchId,
  courseId,
  studentId,
  date,
  session,
  status,
}) => {
  const normalizedDate = normalizeAttendanceDate(date);
  if (!normalizedDate) throw new ManualAttendanceError('A valid attendance date is required');

  const normalizedStatus = normalizeManualStatus(status);
  if (!normalizedStatus) throw new ManualAttendanceError('Status must be present or absent');

  const normalizedSession = normalizeManualSession(session);
  if (!normalizedSession) throw new ManualAttendanceError('Session must be morning or evening');

  const id = positiveId(studentId);
  if (!id) throw new ManualAttendanceError('A valid student is required');

  const batch = await loadBatch({ batchId, courseId });

  const student = await models.Student.findOne({
    where: { id, current_batch_id: batch.id },
    attributes: studentAttributes,
    include: studentInclude,
  });
  if (!student) {
    throw new ManualAttendanceError('This student is not enrolled in the selected class and batch');
  }

  const where = {
    student_id: student.id,
    batch_id: batch.id,
    date: normalizedDate,
    session: normalizedSession,
  };

  let attendance = await models.Attendance.findOne({ where });
  let previousStatus = attendance?.status || null;

  if (attendance) {
    // Preserve punch/leave metadata and every raw biometric event; only the
    // effective status is corrected by the teacher.
    attendance.status = normalizedStatus;
    attendance.course_id = batch.course_id || attendance.course_id || null;
    await attendance.save();
  } else {
    try {
      attendance = await models.Attendance.create({
        ...where,
        course_id: batch.course_id || null,
        status: normalizedStatus,
      });
    } catch (error) {
      // The unique (student, batch, date, session) index can reject a
      // simultaneous duplicate; resolve it by updating the winning row.
      if (error.name !== 'SequelizeUniqueConstraintError') throw error;
      attendance = await models.Attendance.findOne({ where });
      if (!attendance) throw error;
      previousStatus = attendance.status;
      attendance.status = normalizedStatus;
      attendance.course_id = batch.course_id || attendance.course_id || null;
      await attendance.save();
    }
  }

  const guardian = resolveGuardianPhone(student);
  let whatsappUrl = null;
  let notificationReason = null;

  if (guardian) {
    try {
      const message = buildAttendanceMessage({
        studentName: student.User?.name,
        courseTitle: batch.Course?.title,
        batchName: batch.name,
        date: normalizedDate,
        status: normalizedStatus,
      });
      whatsappUrl = buildWhatsAppUrl({ phone: guardian.number, message });
      if (!whatsappUrl) notificationReason = 'The guardian phone number could not be used for WhatsApp.';
    } catch {
      // A template failure must never turn an already-committed attendance
      // save into an error or lose the teacher's work.
      notificationReason = 'The WhatsApp message could not be prepared.';
    }
  } else {
    notificationReason = 'No valid guardian phone number is stored for this student.';
  }

  return {
    attendance: {
      ...attendanceJson(attendance),
      previous_status: previousStatus,
    },
    student: studentJson(student),
    batch: batchJson(batch),
    guardian: {
      available: Boolean(guardian),
      masked: guardian ? maskWhatsAppNumber(guardian.number) : null,
      source: guardian?.field || null,
      source_label: guardian?.label || null,
    },
    whatsapp_url: whatsappUrl,
    notification: {
      prepared: Boolean(whatsappUrl),
      reason: notificationReason,
    },
  };
};
