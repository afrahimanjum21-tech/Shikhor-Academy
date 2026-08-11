import models from '../../models/index.js';
import NotificationService from '../../services/NotificationService.js';
import { sendEmail, escapeHtml, buildAdminActionLinks, resolveAdminRecipients } from '../../services/mailer.js';
import MediaService from '../../services/media/MediaService.js';

export async function submit(req, res) {
  try {
    const {
      full_name, father_name, mother_name, phone, email, dob, address,
      course_id, gender, nationality, religion, blood_group,
      guardian_phone, guardian_name, guardian_relation, guardian_occupation,
      guardian_address, emergency_contact, emergency_name, emergency_phone, emergency_relation, last_school,
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
      guardian_address, emergency_contact, emergency_name, emergency_phone, emergency_relation, last_school,
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

    const recipientEmails = await resolveAdminRecipients('admission_email');
    if (recipientEmails.length > 0) {
      const safe = escapeHtml;
      const links = buildAdminActionLinks(application.id);
      const infoRows = [
        ['Name', full_name],
        ['Phone', phone],
        ['Email', email],
        ['Date of Birth', dob],
        ['Gender', gender],
        ['Blood Group', blood_group],
        ['Father', father_name ? `${father_name}${father_phone ? ` (${father_phone})` : ''}` : null],
        ['Mother', mother_name ? `${mother_name}${mother_phone ? ` (${mother_phone})` : ''}` : null],
        ['Guardian', guardian_name ? `${guardian_name}${guardian_relation ? ` (${guardian_relation})` : ''}${guardian_phone ? ` - ${guardian_phone}` : ''}` : null],
        ['Course', course?.title],
        ['Shift', shift],
        ['Section', section],
        ['Group', group_name],
        ['Subject', subject],
        ['Last School', last_school],
        ['SSC GPA', ssc_gpa],
        ['JSC GPA', jsc_gpa],
        ['Address', address],
        ['Permanent Address', permanent_address],
      ].filter(([, value]) => value);

      const infoHtml = infoRows
        .map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0;font-weight:bold;white-space:nowrap;color:#374151">${safe(label)}</td><td style="padding:6px 0;color:#111827">${safe(value)}</td></tr>`)
        .join('\n');

      await sendEmail({
        to: recipientEmails.join(', '),
        subject: `New Admission Application - ${full_name}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1F4F78">New Admission Application</h2>
            <p>Application <strong>#${application.id}</strong> received on <strong>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>.</p>
            <table style="border-collapse:collapse;font-size:14px">
              ${infoHtml}
            </table>
            <p style="margin-top:20px"><strong>Status:</strong> Pending Review</p>
            <p style="margin-top:24px">Review this application:</p>
            <p style="margin:0">
              <a href="${links.approveUrl}" style="display:inline-block;padding:10px 20px;border-radius:8px;text-decoration:none;color:#ffffff;background:#16a34a;font-weight:bold;font-size:14px">Approve</a>
              <a href="${links.holdUrl}" style="display:inline-block;padding:10px 20px;border-radius:8px;text-decoration:none;color:#ffffff;background:#f59e0b;font-weight:bold;font-size:14px">Hold</a>
              <a href="${links.rejectUrl}" style="display:inline-block;padding:10px 20px;border-radius:8px;text-decoration:none;color:#ffffff;background:#dc2626;font-weight:bold;font-size:14px">Reject</a>
            </p>
            <p style="color:#9ca3af;font-size:12px;margin-top:12px">These action links expire after 72 hours. You can also review this application from the admin panel.</p>
          </div>
        `,
      });
    }

    if (email) {
      await sendEmail({
        to: email,
        subject: 'Admission Application Received - Uttoron Coaching Centre',
        html: `
          <h2>Thank You for Your Application!</h2>
          <p>Dear ${escapeHtml(full_name)},</p>
          <p>We have received your admission application. Our team will review it and get back to you soon.</p>
          ${course ? `<p><strong>Course Applied:</strong> ${escapeHtml(course.title)}</p>` : ''}
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
    res.status(500).json({ message: 'Internal server error' });
  }
}
