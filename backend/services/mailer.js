import nodemailer from 'nodemailer';

export async function sendEmail({ to, subject, html, text }) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '587', 10),
      secure: process.env.MAIL_ENCRYPTION === 'ssl',
      auth: {
        user: process.env.MAIL_USERNAME || '',
        pass: process.env.MAIL_PASSWORD || '',
      },
    });

    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || 'Uttoron Coaching Centre'}" <${process.env.MAIL_FROM_ADDRESS || 'noreply@uttoron.com'}>`,
      to,
      subject,
      html,
      text,
    });

    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.log('Email sending failed (placeholder):', error.message);
    return { messageId: null };
  }
}
