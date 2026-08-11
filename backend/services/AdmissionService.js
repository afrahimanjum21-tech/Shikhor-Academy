import models from '../models/index.js';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import crypto from 'crypto';
import NotificationService from './NotificationService.js';
import { sendEmail, escapeHtml, resolveSiteBaseUrl } from './mailer.js';

const STATUS_NAMES = { approved: 'Approved', rejected: 'Rejected', hold: 'On Hold' };

class AdmissionServiceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const generateStudentId = async () => {
  const year = new Date().getFullYear();
  const prefix = `UCC-${year}-`;
  // Use MAX(existing suffix) + 1 instead of COUNT + 1 so soft-deleted or
  // re-used card numbers can never collide.
  const rows = await models.Student.findAll({
    where: { student_id_card_no: { [Op.like]: `${prefix}%` } },
    attributes: ['student_id_card_no'],
  });
  let max = 0;
  for (const row of rows) {
    const suffix = row.student_id_card_no.slice(prefix.length);
    const n = parseInt(suffix, 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
};

const findDefaultBatchId = async (courseId) => {
  if (!courseId) return null;
  const batch = await models.Batch.findOne({
    where: { course_id: courseId },
    order: [['id', 'ASC']],
  });
  return batch?.id || null;
};

const buildStudentFromAdmission = async (admission, userId) => ({
  user_id: userId,
  admission_id: admission.id,
  student_id_card_no: await generateStudentId(),
  current_batch_id: await findDefaultBatchId(admission.course_id),
  guardian_phone: admission.guardian_phone,
  emergency_contact_name: admission.emergency_name || admission.emergency_contact_name,
  emergency_contact_phone: admission.emergency_phone || admission.emergency_mobile || admission.emergency_contact,
  emergency_contact_relation: admission.emergency_relation || admission.emergency_contact_relation,
  admission_date: new Date().toISOString().split('T')[0],
  gender: admission.gender,
  nationality: admission.nationality,
  religion: admission.religion,
  blood_group: admission.blood_group,
  dob: admission.dob,
  father_name: admission.father_name,
  father_phone: admission.father_phone,
  father_occupation: admission.father_occupation,
  mother_name: admission.mother_name,
  mother_phone: admission.mother_phone,
  mother_occupation: admission.mother_occupation,
  present_address: admission.address,
  permanent_address: admission.permanent_address,
  emergency_contact_phone: admission.emergency_contact,
  emergency_contact_name: admission.guardian_name,
  emergency_contact_relation: admission.guardian_relation,
  last_school: admission.last_school,
  jsc_roll: admission.jsc_roll,
  jsc_registration: admission.jsc_registration,
  jsc_gpa: admission.jsc_gpa,
  ssc_roll: admission.ssc_roll,
  ssc_registration: admission.ssc_registration,
  ssc_gpa: admission.ssc_gpa,
  shift: admission.shift,
  section: admission.section,
  group_name: admission.group_name,
  subject: admission.subject,
});

const generatePassword = () => {
  return crypto.randomBytes(12).toString('hex');
};

const getCourseTitle = async (courseId) => {
  if (!courseId) return null;
  const course = await models.Course.findByPk(courseId, { attributes: ['title'] });
  return course?.title || null;
};

const sendStudentStatusEmail = async ({ admission, status, user, plainPassword, isNewUser }) => {
  const email = admission.email;
  if (!email) {
    console.warn(`No student email on admission #${admission.id}; skipping ${status} email`);
    return;
  }

  const courseTitle = await getCourseTitle(admission.course_id);
  const safe = escapeHtml;
  const name = safe(admission.full_name);
  const courseLine = courseTitle ? `<p><strong>Course:</strong> ${safe(courseTitle)}</p>` : '';
  const loginUrl = `${resolveSiteBaseUrl()}/login`;
  let subject;
  let body;

  if (status === 'approved') {
    subject = 'Admission Approved - Uttoron Coaching Centre';
    body = `
      <h2>Congratulations!</h2>
      <p>Dear ${name},</p>
      <p>We are delighted to inform you that your admission to <strong>Uttoron Coaching Centre</strong> has been <strong>approved</strong>.</p>
      ${courseLine}
      ${isNewUser && user && plainPassword ? `
        <p>Your student account has been created. Here are your login credentials:</p>
        <p><strong>Username (Email):</strong> ${safe(user.email)}</p>
        <p><strong>Password:</strong> ${safe(plainPassword)}</p>
        <p>Please log in at <a href="${loginUrl}">${loginUrl}</a> and change your password after your first login.</p>
      ` : `
        <p>You can log in to your student account at <a href="${loginUrl}">${loginUrl}</a>.</p>
      `}
      <p>Welcome aboard!</p>
      <br/>
      <p>Best regards,<br/>Uttoron Coaching Centre</p>
    `;
  } else if (status === 'rejected') {
    subject = 'Admission Application Status - Uttoron Coaching Centre';
    body = `
      <h2>Admission Application Update</h2>
      <p>Dear ${name},</p>
      <p>Thank you for applying to <strong>Uttoron Coaching Centre</strong>.</p>
      <p>We regret to inform you that your admission application has been <strong>rejected</strong> after careful review.</p>
      ${courseLine}
      <p>If you believe this is a mistake or would like to discuss other options, please contact us and we will be happy to help.</p>
      <br/>
      <p>Best regards,<br/>Uttoron Coaching Centre</p>
    `;
  } else if (status === 'hold') {
    subject = 'Admission Application Status - Uttoron Coaching Centre';
    body = `
      <h2>Admission Application Update</h2>
      <p>Dear ${name},</p>
      <p>Thank you for applying to <strong>Uttoron Coaching Centre</strong>.</p>
      <p>Your application is currently <strong>on hold</strong> while we review it. We will contact you soon with an update.</p>
      ${courseLine}
      <p>Please feel free to reach out to us if you have any questions.</p>
      <br/>
      <p>Best regards,<br/>Uttoron Coaching Centre</p>
    `;
  } else {
    return;
  }

  await sendEmail({ to: email, subject, html: body });
};

const notifyStudent = async ({ admission, status, userId }) => {
  const targetId = userId || (await models.Student.findOne({
    where: { admission_id: admission.id },
    attributes: ['user_id'],
  }))?.user_id;
  if (!targetId) return;
  const titleMap = {
    approved: 'Congratulations! Your admission has been approved.',
    rejected: 'Your admission application has been rejected.',
    hold: 'Your admission application is on hold.',
  };
  await NotificationService.create({
    userId: targetId,
    type: 'admission',
    title: titleMap[status],
    body: `Application for ${admission.full_name} is now ${STATUS_NAMES[status]}.`,
    actionUrl: '/student/profile',
    actionLabel: 'View Status',
  }).catch(err => console.warn('Student notification failed:', err.message));
};

export async function approveAdmission({ admissionId, email }) {
  const admission = await models.AdmissionApplication.findByPk(admissionId);
  if (!admission) throw new AdmissionServiceError('Admission application not found', 404);
  if (!['pending', 'hold'].includes(admission.status)) {
    throw new AdmissionServiceError(`Admission is already ${admission.status}`, 400);
  }

  const userEmail = email || admission.email;
  if (!userEmail) {
    throw new AdmissionServiceError('Email is required to create a student account', 400);
  }

  let user = await models.User.findOne({ where: { email: userEmail }, paranoid: false });
  let plainPassword;
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    user = await models.User.create({
      name: admission.full_name,
      email: userEmail,
      password: hashedPassword,
      role: 'student',
      phone: admission.phone,
      profile_photo_path: admission.photo_path,
    });
  } else if (user.deletedAt) {
    await user.restore();
  }

  let student = await models.Student.findOne({ where: { user_id: user.id } });
  if (!student) {
    student = await models.Student.create(await buildStudentFromAdmission(admission, user.id));
  }

  await admission.update({ status: 'approved' });

  await sendStudentStatusEmail({ admission, status: 'approved', user, plainPassword, isNewUser });
  await notifyStudent({ admission, status: 'approved', userId: user.id });

  return { admission, user, student, isNewUser, plainPassword };
}

export async function rejectAdmission({ admissionId }) {
  const admission = await models.AdmissionApplication.findByPk(admissionId);
  if (!admission) throw new AdmissionServiceError('Admission application not found', 404);
  if (!['pending', 'hold'].includes(admission.status)) {
    throw new AdmissionServiceError(`Admission is already ${admission.status}`, 400);
  }

  await admission.update({ status: 'rejected' });

  await sendStudentStatusEmail({ admission, status: 'rejected' });
  await notifyStudent({ admission, status: 'rejected' });

  return { admission };
}

export async function holdAdmission({ admissionId }) {
  const admission = await models.AdmissionApplication.findByPk(admissionId);
  if (!admission) throw new AdmissionServiceError('Admission application not found', 404);
  if (admission.status !== 'pending') {
    throw new AdmissionServiceError('Can only hold pending applications', 400);
  }

  await admission.update({ status: 'hold' });

  await sendStudentStatusEmail({ admission, status: 'hold' });
  await notifyStudent({ admission, status: 'hold' });

  return { admission };
}
