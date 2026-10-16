import models from '../../models/index.js';
import NotificationService from '../../services/NotificationService.js';
import { sendEmail, escapeHtml, resolveAdminRecipients } from '../../services/mailer.js';

export async function submit(req, res) {
  try {
    const { name, email, subject, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }

    const contactMessage = await models.ContactMessage.create({
      name, email, subject, phone, message,
    });

    await NotificationService.createForAdmins({
      type: 'contact',
      title: 'New Contact Message',
      body: `${name} sent a new message: ${subject || 'No Subject'}`,
      actionUrl: '/admin/contact-messages',
      actionLabel: 'View Message',
    });

    const recipientEmails = await resolveAdminRecipients('messages_email');
    if (recipientEmails.length > 0) {
      const safe = escapeHtml;
      await sendEmail({
        to: recipientEmails.join(', '),
        subject: `New Contact Message - ${safe(name)}`,
        html: `
          <h2>New Contact Message</h2>
          <p><strong>Name:</strong> ${safe(name)}</p>
          <p><strong>Email:</strong> ${safe(email)}</p>
          <p><strong>Phone:</strong> ${safe(phone) || 'N/A'}</p>
          <p><strong>Subject:</strong> ${safe(subject) || 'N/A'}</p>
          <p><strong>Message:</strong></p>
          <p>${safe(message).replace(/\n/g, '<br/>')}</p>
        `,
      });
    }

    await sendEmail({
      to: email,
      subject: 'We Received Your Message - Shikhor Academy',
      html: `
        <h2>Thank You for Contacting Us!</h2>
        <p>Dear ${escapeHtml(name)},</p>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <p>Best Regards,<br/>Shikhor Academy</p>
      `,
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: { id: contactMessage.id },
    });
  } catch (error) {
    console.error('Contact submit error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
