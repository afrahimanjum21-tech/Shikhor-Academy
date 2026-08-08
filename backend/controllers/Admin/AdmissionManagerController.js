import models from '../../models/index.js';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { Op } from 'sequelize';

const getMailTransport = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT, 10) || 587,
    secure: (process.env.MAIL_ENCRYPTION || 'tls') === 'ssl',
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
  });
};

const sendCredentialsEmail = async (admission, user, plainPassword) => {
  try {
    const transport = getMailTransport();
    const fromAddress = process.env.MAIL_FROM_ADDRESS || 'afrahimanjum21@gmail.com';
    const fromName = process.env.MAIL_FROM_NAME || 'Uttoron Coaching Centre';

    await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: user.email,
      subject: 'Admission Approved - Your Account Credentials',
      html: `
        <h2>Welcome to ${fromName}</h2>
        <p>Dear ${admission.full_name},</p>
        <p>Your admission has been approved. Here are your login credentials:</p>
        <p><strong>Username (Email):</strong> ${user.email}</p>
        <p><strong>Password:</strong> ${plainPassword}</p>
        <p>Please log in and change your password.</p>
        <p>Best regards,<br/>${fromName}</p>
      `,
    });
  } catch (err) {
    console.error('Failed to send credentials email:', err.message);
  }
};

const generateStudentId = async () => {
  const year = new Date().getFullYear();
  const count = await models.Student.count();
  return `UCC-${year}-${String(count + 1).padStart(4, '0')}`;
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

export const index = async (req, res) => {
  try {
    const admissions = await models.AdmissionApplication.findAll({
      include: [{ model: models.Course, attributes: ['id', 'title', 'slug'] }],
      order: [['createdAt', 'DESC']],
    });

    const data = admissions.map(a => {
      const json = a.toJSON();
      const courseTitle = json.course?.title || json.Course?.title || null;
      if (!courseTitle && json.course_id) {
        console.warn(`Admission #${json.id}: course_id=${json.course_id} but course data is missing`);
      }
      json.course_title = courseTitle;
      return json;
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admissions' });
  }
};

export const approve = async (req, res) => {
  try {
    const { id } = req.params;

    const admission = await models.AdmissionApplication.findByPk(id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission application not found' });
    }

    if (!['pending', 'hold'].includes(admission.status)) {
      return res.status(400).json({ message: `Admission is already ${admission.status}` });
    }

    const userEmail = req.body.email || admission.email;
    if (!userEmail) {
      return res.status(400).json({ message: 'Email is required to create a student account' });
    }

    let user = await models.User.findOne({
      where: { email: userEmail },
      paranoid: false,
    });
    let plainPassword;
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      plainPassword = Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).toUpperCase().slice(2, 6);
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

    if (isNewUser && user.email) {
      sendCredentialsEmail(admission, user, plainPassword);
    }

    res.json({
      message: 'Admission approved successfully',
      data: { admission, user, student },
    });
  } catch (error) {
    console.error('AdmissionManagerController.approve error:', error);
    res.status(500).json({ message: `Failed to approve admission: ${error.message}` });
  }
};

export const bulkAction = async (req, res) => {
  try {
    const { ids, action } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids must be a non-empty array' });
    }

    const statusMap = { approve: 'approved', reject: 'rejected', hold: 'hold', approved: 'approved', rejected: 'rejected' };
    const status = statusMap[action];

    if (!status) {
      return res.status(400).json({ message: 'Invalid action. Use: approve, reject, hold' });
    }

    const admissions = await models.AdmissionApplication.findAll({
      where: { id: { [Op.in]: ids } },
    });

    let validStatuses;
    if (status === 'hold') {
      validStatuses = ['pending'];
    } else {
      validStatuses = ['pending', 'hold'];
    }

    const validAdmissions = admissions.filter(a => validStatuses.includes(a.status));
    const validIds = validAdmissions.map(a => a.id);

    if (validIds.length === 0) {
      return res.status(400).json({ message: `No applicable admissions found for ${action}` });
    }

    await models.AdmissionApplication.update(
      { status },
      { where: { id: { [Op.in]: validIds } } }
    );

    if (status === 'approved') {
      for (const admission of validAdmissions) {
        if (!admission.email) {
          console.warn(`Skipping user creation for admission #${admission.id}: no email`);
          continue;
        }

        const plainPassword = Math.random().toString(36).slice(2, 10) +
          Math.random().toString(36).toUpperCase().slice(2, 6);
        const hashedPassword = await bcrypt.hash(plainPassword, 12);

        const user = await models.User.create({
          name: admission.full_name,
          email: admission.email,
          password: hashedPassword,
          role: 'student',
          phone: admission.phone,
          profile_photo_path: admission.photo_path,
        });

        await models.Student.create(await buildStudentFromAdmission(admission, user.id));

        sendCredentialsEmail(admission, user, plainPassword);
      }
    }

    res.json({
      message: `${validIds.length} admission(s) updated to ${status}`,
    });
  } catch (error) {
    res.status(500).json({ message: 'Bulk action failed' });
  }
};

export const singleAction = async (req, res) => {
  try {
    const { id, action } = req.params;

    const statusMap = { reject: 'rejected', hold: 'hold' };
    const status = statusMap[action];

    if (!status) {
      return res.status(400).json({ message: 'Invalid action. Use: reject, hold' });
    }

    const admission = await models.AdmissionApplication.findByPk(id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission application not found' });
    }

    if (action === 'hold' && admission.status !== 'pending') {
      return res.status(400).json({ message: 'Can only hold pending applications' });
    }

    if (action === 'reject' && !['pending', 'hold'].includes(admission.status)) {
      return res.status(400).json({ message: `Admission is already ${admission.status}` });
    }

    await admission.update({ status });

    res.json({
      message: `Admission ${status === 'rejected' ? 'rejected' : 'put on hold'} successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: `Failed to ${req.params.action} admission` });
  }
};
