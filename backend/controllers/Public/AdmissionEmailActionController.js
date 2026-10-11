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

const ACTION_META = {
  approve: { label: 'Approve', color: '#16a34a' },
  hold: { label: 'Hold', color: '#f59e0b' },
  reject: { label: 'Reject', color: '#dc2626' },
};

// Confirmation page for the email action links. Renders a form that POSTs the
// action; it NEVER changes state itself (SEC-2) — so email prefetchers that
// auto-follow GET links cannot approve/reject/hold an admission.
const renderConfirmPage = ({ action, token, admissionId }) => {
  const meta = ACTION_META[action];
  const base = resolveSiteBaseUrl();
  const tokenAttr = escapeHtml(token);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Confirm ${meta.label} - Uttoron Coaching Centre</title>
<style>${PAGE_STYLES}
.confirm-btn { margin-top:8px; padding:12px 28px; border:0; border-radius:8px; cursor:pointer; color:#fff; font-size:15px; font-weight:bold; background:${meta.color}; }
.ctx { color:#111827; font-weight:bold; }</style></head>
<body>
  <div class="card">
    <h2>Confirm: ${meta.label} admission</h2>
    <p>You are about to <span class="ctx">${meta.label.toLowerCase()}</span> admission application <span class="ctx">#${admissionId}</span>. The applicant will be notified by email.</p>
    <form method="post" action="${base}/api/public/admissions/action">
      <input type="hidden" name="token" value="${tokenAttr}" />
      <input type="hidden" name="action" value="${action}" />
      <button type="submit" class="confirm-btn">Confirm ${meta.label}</button>
    </form>
    <p style="color:#9ca3af;font-size:12px;margin-top:16px">No change is made until you click confirm. If this was not you, close this page.</p>
  </div>
</body></html>`;
};

// GET handler for the email action links. It ONLY renders the confirmation
// page — it performs NO state change (SEC-2). The token is verified (read-only)
// so an invalid/expired link shows a clear message instead of a form.
export async function confirmPage(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { token, action: requestedAction } = req.query;

    if (!token || !VALID_ACTIONS.includes(requestedAction)) {
      return res.status(400).send(renderPage({ type: 'error', title: 'Invalid Link', message: 'This link is invalid. Please contact the coaching centre for help.' }));
    }

    let payload;
    try {
      payload = jwt.verify(token, authConfig.jwtSecret, { algorithms: [authConfig.jwtAlgorithm] });
    } catch {
      return res.status(400).send(renderPage({ type: 'error', title: 'Link Expired', message: 'This action link is invalid or has expired (links expire after 72 hours). Please contact the coaching centre for help.' }));
    }

    const { admissionId, action: tokenAction } = payload;
    if (tokenAction !== requestedAction || !Number.isInteger(admissionId)) {
      return res.status(400).send(renderPage({ type: 'error', title: 'Invalid Link', message: 'This link is invalid. Please contact the coaching centre for help.' }));
    }

    return res.send(renderConfirmPage({ action: requestedAction, token, admissionId }));
  } catch (error) {
    console.error('Admission confirm page error:', error);
    return res.status(500).send(renderPage({ type: 'error', title: 'Something Went Wrong', message: 'The page could not be loaded. Please try again or use the admin panel.' }));
  }
}

// POST handler — performs the actual status change, only when the admin submits
// the confirmation form from confirmPage(). A bare GET can never mutate state
// (SEC-2). The token re-verified here is bound to the admission id + action,
// and AdmissionService enforces the status invariants (no duplicate/conflicting
// transitions).
export async function action(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { token, action: requestedAction } = req.body;

    if (!token || !VALID_ACTIONS.includes(requestedAction)) {
      return res.status(400).send(renderPage({ type: 'error', title: 'Invalid Link', message: 'This link is invalid. Please contact the coaching centre for help.' }));
    }

    let payload;
    try {
      payload = jwt.verify(token, authConfig.jwtSecret, { algorithms: [authConfig.jwtAlgorithm] });
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
