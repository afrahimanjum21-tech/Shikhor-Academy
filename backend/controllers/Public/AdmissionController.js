import models from '../../models/index.js';
import NotificationService from '../../services/NotificationService.js';
import { sendEmail } from '../../services/mailer.js';
import MediaService from '../../services/media/MediaService.js';

export async function submit(req, res) {
  try {
    const {
      full_name, father_name, mother_name, phone, email, dob, address,
      course_id, gender, nationality, religion, blood_group,
      guardian_phone, guardian_name, guardian_relation, guardian_occupation,
      guardian_address, emergency_contact, last_school,
      jsc_roll, jsc_registration, jsc_gpa,
      ssc_roll, ssc_registration, ssc_gpa,
      father_phone, father_occupation, mother_phone, mother_occupation,
      permanent_address, shift, section, group_name, subject,
    } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ message: 'Full name and phone are required' });
    }

    let photo_path = null;
    if (req.file) {
      try {
        const uploadResult = await MediaService.upload(req.file, { folder: 'admission' });
        photo_path = uploadResult.url;
      } catch (uploadError) {
        console.error('Photo upload failed (continuing without photo):', uploadError);
      }
    }

    const application = await models.AdmissionApplication.create({
      full_name, father_name, mother_name, phone, email, dob, address,
      course_id, photo_path, status: 'pending',
      gender, nationality, religion, blood_group,
      guardian_phone, guardian_name, guardian_relation, guardian_occupation,
      guardian_address, emergency_contact, last_school,
      jsc_roll, jsc_registration, jsc_gpa,
      ssc_roll, ssc_registration, ssc_gpa,
      father_phone, father_occupation, mother_phone, mother_occupation,
      permanent_address, shift, section, group_name, subject,
    });

    const course = course_id ? await models.Course.findByPk(course_id) : null;

    await NotificationService.createForAdmins({
      type: 'admission',
      title: 'New Admission Application',
      body: `${full_name} has submitted an admission application${course ? ` for ${course.title}` : ''}.`,
      actionUrl: '/admin/admissions',
      actionLabel: 'Review Application',
    });

    const adminEmails = await models.User.findAll({
      where: { role: ['admin', 'super_admin'], is_active: true },
      attributes: ['email'],
    });

    const recipientEmails = adminEmails.map(u => u.email).filter(Boolean);
    if (recipientEmails.length > 0) {
      await sendEmail({
        to: recipientEmails.join(', '),
        subject: `New Admission Application - ${full_name}`,
        html: `
          <h2>New Admission Application</h2>
          <p><strong>Name:</strong> ${full_name}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Email:</strong> ${email || 'N/A'}</p>
          ${course ? `<p><strong>Course:</strong> ${course.title}</p>` : ''}
          <p><strong>Status:</strong> Pending Review</p>
        `,
      });
    }

    if (email) {
      await sendEmail({
        to: email,
        subject: 'Admission Application Received - Uttoron Coaching Centre',
        html: `
          <h2>Thank You for Your Application!</h2>
          <p>Dear ${full_name},</p>
          <p>We have received your admission application. Our team will review it and get back to you soon.</p>
          ${course ? `<p><strong>Course Applied:</strong> ${course.title}</p>` : ''}
          <p>If you have any questions, please contact us.</p>
          <br/>
          <p>Best Regards,<br/>Uttoron Coaching Centre</p>
        `,
      });
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application: { id: application.id, status: application.status },
    });
  } catch (error) {
    console.error('Admission submit error:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}
