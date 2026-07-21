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
    const fromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@uttoron.com';
    const fromName = process.env.MAIL_FROM_NAME || 'Uttoron Coaching Centre';

    await transport.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: admission.email,
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
    res.status(500).json({ message: 'Failed to fetch admissions', error: error.message });
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

    const plainPassword = Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).toUpperCase().slice(2, 6);

    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const user = await models.User.create({
      name: admission.full_name,
      email: admission.email,
      password: hashedPassword,
      role: 'student',
      phone: admission.phone,
    });

    const student = await models.Student.create({
      user_id: user.id,
      admission_id: admission.id,
      guardian_phone: admission.guardian_phone,
      admission_date: new Date().toISOString().split('T')[0],
      gender: admission.gender,
      nationality: admission.nationality,
      religion: admission.religion,
      blood_group: admission.blood_group,
      dob: admission.dob,
      father_name: admission.father_name,
      mother_name: admission.mother_name,
      present_address: admission.address,
      last_school: admission.last_school,
      emergency_contact_phone: admission.emergency_contact,
      jsc_roll: admission.jsc_roll,
      jsc_registration: admission.jsc_registration,
      jsc_gpa: admission.jsc_gpa,
      ssc_roll: admission.ssc_roll,
      ssc_registration: admission.ssc_registration,
      ssc_gpa: admission.ssc_gpa,
    });

    await admission.update({ status: 'approved' });

    if (admission.email) {
      sendCredentialsEmail(admission, user, plainPassword);
    }

    res.json({
      message: 'Admission approved successfully',
      data: { admission, user, student },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve admission', error: error.message });
  }
};

export const bulkAction = async (req, res) => {
  try {
    const { ids, action } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids must be a non-empty array' });
    }

    if (!['approved', 'rejected', 'hold'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use: approved, rejected, hold' });
    }

    const admissions = await models.AdmissionApplication.findAll({
      where: { id: { [Op.in]: ids } },
    });

    const pendingAdmissions = admissions.filter(a => a.status === 'pending');
    const pendingIds = pendingAdmissions.map(a => a.id);

    if (pendingIds.length === 0) {
      return res.status(400).json({ message: 'No pending admissions found among the provided ids' });
    }

    await models.AdmissionApplication.update(
      { status: action },
      { where: { id: { [Op.in]: pendingIds } } }
    );

    if (action === 'approved') {
      for (const admission of pendingAdmissions) {
        const plainPassword = Math.random().toString(36).slice(2, 10) +
          Math.random().toString(36).toUpperCase().slice(2, 6);
        const hashedPassword = await bcrypt.hash(plainPassword, 12);

        const user = await models.User.create({
          name: admission.full_name,
          email: admission.email,
          password: hashedPassword,
          role: 'student',
          phone: admission.phone,
        });

        await models.Student.create({
          user_id: user.id,
          admission_id: admission.id,
          guardian_phone: admission.guardian_phone,
          admission_date: new Date().toISOString().split('T')[0],
          gender: admission.gender,
          nationality: admission.nationality,
          dob: admission.dob,
        });

        if (admission.email) {
          sendCredentialsEmail(admission, user, plainPassword);
        }
      }
    }

    res.json({
      message: `${pendingIds.length} admission(s) updated to ${action}`,
    });
  } catch (error) {
    res.status(500).json({ message: 'Bulk action failed', error: error.message });
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
    res.status(500).json({ message: `Failed to ${req.params.action} admission`, error: error.message });
  }
};
