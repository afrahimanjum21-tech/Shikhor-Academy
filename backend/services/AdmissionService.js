import models, { sequelize } from '../models/index.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import NotificationService from './NotificationService.js';
import { sendEmail, escapeHtml, resolveSiteBaseUrl } from './mailer.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';
import { nextStudentId, withStudentIdRetry } from './studentId.js';
import { signSetupToken } from './passwordSetupToken.js';

const STATUS_NAMES = { approved: 'Approved', rejected: 'Rejected', hold: 'On Hold' };

class AdmissionServiceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

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

const sendStudentStatusEmail = async ({ admission, status, user, setupUrl, isNewUser }) => {
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
    subject = 'Admission Approved - Shikhor Academy';
    body = `
      <h2>Congratulations!</h2>
      <p>Dear ${name},</p>
      <p>We are delighted to inform you that your admission to <strong>Shikhor Academy</strong> has been <strong>approved</strong>.</p>
      ${courseLine}
      ${isNewUser && setupUrl ? `
        <p>Your student account has been created. For your security we do not send passwords by email — please set your own password using the secure link below:</p>
        <p><a href="${setupUrl}" style="display:inline-block;padding:10px 18px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:6px">Set your password</a></p>
        <p>Or paste this link into your browser:<br/><a href="${setupUrl}">${setupUrl}</a></p>
        <p>This link is valid for 48 hours and can be used once. If it expires, please contact Shikhor Academy for a new link.</p>
        <p><strong>Username (Email):</strong> ${safe(user ? user.email : email)}</p>
      ` : `
        <p>You can log in to your student account at <a href="${loginUrl}">${loginUrl}</a>.</p>
      `}
      <p>Welcome aboard!</p>
      <br/>
      <p>Best regards,<br/>Shikhor Academy</p>
    `;
  } else if (status === 'rejected') {
    subject = 'Admission Application Status - Shikhor Academy';
    body = `
      <h2>Admission Application Update</h2>
      <p>Dear ${name},</p>
      <p>Thank you for applying to <strong>Shikhor Academy</strong>.</p>
      <p>We regret to inform you that your admission application has been <strong>rejected</strong> after careful review.</p>
      ${courseLine}
      <p>If you believe this is a mistake or would like to discuss other options, please contact us and we will be happy to help.</p>
      <br/>
      <p>Best regards,<br/>Shikhor Academy</p>
    `;
  } else if (status === 'hold') {
    subject = 'Admission Application Status - Shikhor Academy';
    body = `
      <h2>Admission Application Update</h2>
      <p>Dear ${name},</p>
      <p>Thank you for applying to <strong>Shikhor Academy</strong>.</p>
      <p>Your application is currently <strong>on hold</strong> while we review it. We will contact you soon with an update.</p>
      ${courseLine}
      <p>Please feel free to reach out to us if you have any questions.</p>
      <br/>
      <p>Best regards,<br/>Shikhor Academy</p>
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

export async function approveAdmission({ admissionId, email, password }) {
  // Atomic identity writes; the student id is generated inside the tx and the
  // whole tx is retried on a concurrent id collision.
  const outcome = await withStudentIdRetry(() => sequelize.transaction(async (t) => {
    const admission = await models.AdmissionApplication.findByPk(admissionId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!admission) throw new AdmissionServiceError('Admission application not found', 404);
    if (!['pending', 'hold'].includes(admission.status)) throw new AdmissionServiceError(`Admission is already ${admission.status}`, 400);

    const userEmail = normalizeEmail(email || admission.email);
    if (!userEmail) throw new AdmissionServiceError('Email is required to create a student account', 400);

    let user = await models.User.findOne({ where: { email: userEmail }, paranoid: false, transaction: t });
    let plainPassword;
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      plainPassword = password && password !== '' ? password : generatePassword();
      user = await models.User.create({ name: admission.full_name, email: userEmail, password: await bcrypt.hash(plainPassword, 12), role: 'student', phone: admission.phone, profile_photo_path: admission.photo_path }, { transaction: t });
    } else if (user.role && user.role !== 'student') {
      throw new AdmissionServiceError(`An account with this email already exists as "${user.role}". Use a different email for the student.`, 409);
    } else if (user.deletedAt) {
      await user.restore({ transaction: t });
      isNewUser = true;
      plainPassword = password && password !== '' ? password : generatePassword();
      user.password = await bcrypt.hash(plainPassword, 12);
      if (!user.name) user.name = admission.full_name;
      await user.save({ transaction: t });
    } else if (password && password !== '') {
      plainPassword = password;
      user.password = await bcrypt.hash(plainPassword, 12);
      await user.save({ transaction: t });
    }

    let student = await models.Student.findOne({ where: { user_id: user.id }, transaction: t });
    if (!student) {
      const values = await buildStudentFromAdmission(admission, user.id);
      values.student_id_card_no = await nextStudentId({ transaction: t });
      student = await models.Student.create(values, { transaction: t });
    }

    await admission.update({ status: 'approved' }, { transaction: t });
    return { admission, user, student, isNewUser, plainPassword };
  }));

  // Post-commit side effects must never turn a committed approval into a 500.
  // E5: for a freshly-created account with an auto-generated (unknown) password
  // we email a one-time SETUP LINK instead of a plaintext password. The token
  // is bound to the account's current bcrypt hash, so it self-invalidates the
  // moment the student sets their password. When an admin supplied an explicit
  // password we send a neutral "log in" email (admin shares it out-of-band) and
  // never email the password.
  let setupUrl = null;
  const adminSuppliedPassword = !!(password && password !== '');
  if (outcome.isNewUser && !adminSuppliedPassword && outcome.user?.password) {
    try {
      const setupToken = signSetupToken({ userId: outcome.user.id, passwordHash: outcome.user.password });
      setupUrl = `${resolveSiteBaseUrl()}/set-password?token=${encodeURIComponent(setupToken)}`;
    } catch (err) {
      console.warn('Setup-link generation failed (approval already committed):', err.message);
    }
  }

  try {
    await sendStudentStatusEmail({ admission: outcome.admission, status: 'approved', user: outcome.user, setupUrl, isNewUser: outcome.isNewUser });
  } catch (err) {
    console.warn('Approval email failed (approval already committed):', err.message);
  }
  await notifyStudent({ admission: outcome.admission, status: 'approved', userId: outcome.user.id });
  return outcome;
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
