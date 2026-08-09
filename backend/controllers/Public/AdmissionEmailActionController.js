import jwt from 'jsonwebtoken';
import authConfig from '../../config/auth.js';
import * as AdmissionService from '../../services/AdmissionService.js';
import { resolveSiteBaseUrl } from '../../services/mailer.js';

const VALID_ACTIONS = ['approve', 'reject', 'hold'];

const PAGE_STYLES = `
  body { font-family: Arial, Helvetica, sans-serif; background: #f3f4f6; margin: 0; padding: 24px; }
  .card { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); text-align: center; }
  .badge { display: inline-block; width: 56px; height: 56px; border-radius: 50%; line-height: 56px; font-size: 28px; }
  h2 { color: #111827; margin: 16px 0 8px; }
  p { color: #4b5563; font-size: 14px; line-height: 1.6; }
  .button { display: inline-block; margin-top: 16px; padding: 10px 22px; border-radius: 8px; text-decoration: none; color: #ffffff; font-size: 14px; background: #1F4F78; }
`;

const renderPage = ({ type, title, message }) => {
  const badge = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  }[type] || 'ℹ️';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>${PAGE_STYLES}</style>
</head>
<body>
  <div class="card">
    <div class="badge">${badge}</div>
    <h2>${title}</h2>
    <p>${message}</p>
    <a class="button" href="${resolveSiteBaseUrl()}">Go to Uttoron Coaching Centre</a>
  </div>
</body>
</html>`;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// GET handler reached from the action buttons in the admin notification
// email. The token is a short-lived JWT signed with the server secret and
// bound to both the admission id and the requested action, so only the
// recipient of the email can trigger these status changes.
export async function action(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { token, action: requestedAction } = req.query;

    if (!token || !VALID_ACTIONS.includes(requestedAction)) {
      return res.status(400).send(renderPage({ type: 'error', title: 'Invalid Link', message: 'This link is invalid. Please contact the coaching centre for help.' }));
    }

    let payload;
    try {
      payload = jwt.verify(token, authConfig.jwtSecret);
    } catch {
      return res.status(400).send(renderPage({ type: 'error', title: 'Link Expired', message: 'This action link is invalid or has expired (links expire after 72 hours). Please contact the coaching centre for help.' }));
    }

    const { admissionId, action: tokenAction } = payload;
    if (tokenAction !== requestedAction || !Number.isInteger(admissionId)) {
      return res.status(400).send(renderPage({ type: 'error', title: 'Invalid Link', message: 'This link is invalid. Please contact the coaching centre for help.' }));
    }

    let result;
    try {
      if (requestedAction === 'approve') {
        result = await AdmissionService.approveAdmission({ admissionId });
      } else if (requestedAction === 'reject') {
        result = await AdmissionService.rejectAdmission({ admissionId });
      } else {
        result = await AdmissionService.holdAdmission({ admissionId });
      }
    } catch (error) {
      if (error.status === 400 && /already|only hold/.test(error.message)) {
        return res.status(200).send(renderPage({ type: 'info', title: 'Already Processed', message: 'This application has already been processed. No further action was taken.' }));
      }
      throw error;
    }

    const applicant = escapeHtml(result.admission.full_name);
    if (requestedAction === 'approve') {
      res.send(renderPage({
        type: 'success',
        title: 'Admission Approved',
        message: `${applicant}'s admission has been approved and the student has been notified by email.`,
      }));
    } else if (requestedAction === 'reject') {
      res.send(renderPage({
        type: 'success',
        title: 'Admission Rejected',
        message: `${applicant}'s admission has been rejected and the applicant has been notified by email.`,
      }));
    } else {
      res.send(renderPage({
        type: 'success',
        title: 'Admission Put on Hold',
        message: `${applicant}'s admission has been put on hold and the applicant has been notified by email.`,
      }));
    }
  } catch (error) {
    console.error('Admission email action error:', error);
    res.status(500).send(renderPage({
      type: 'error',
      title: 'Something Went Wrong',
      message: 'The action could not be completed. Please try again from the admin panel or contact support.',
    }));
  }
}
