import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import models from '../../models/index.js';
import authConfig from '../../config/auth.js';
import { sendEmail, escapeHtml, resolveSiteBaseUrl } from '../../services/mailer.js';

const VERIFY_EXPIRES_IN = '30m';

// Email-only changes are sent to the current (old) address, so an attacker who
// takes over the account cannot silently move it to their own inbox without
// the owner confirming from the old mailbox.
function buildVerifyToken({ userId, currentEmail, newEmail, newPasswordHash }) {
  return jwt.sign(
    { purpose: 'credential_change', userId, currentEmail, newEmail: newEmail || null, newPasswordHash: newPasswordHash || null },
    authConfig.jwtSecret,
    { algorithm: authConfig.jwtAlgorithm, expiresIn: VERIFY_EXPIRES_IN }
  );
}

export async function requestChange(req, res) {
  try {
    const { currentPassword, newPassword, newEmail } = req.body;
    const user = await models.User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required' });
    }

    const passwordOk = await bcrypt.compare(currentPassword, user.password);
    if (!passwordOk) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const wantsNewPassword = !!newPassword;
    const wantsNewEmail = !!newEmail;

    if (!wantsNewPassword && !wantsNewEmail) {
      return res.status(400).json({ message: 'Provide a new password and/or a new email' });
    }

    if (wantsNewPassword) {
      const { minLength, maxLength } = authConfig.passwordPolicy;
      if (newPassword.length < minLength) {
        return res.status(400).json({ message: `New password must be at least ${minLength} characters` });
      }
      if (newPassword.length > maxLength) {
        return res.status(400).json({ message: `New password must be at most ${maxLength} characters` });
      }
    }

    if (wantsNewEmail) {
      const cleanNewEmail = String(newEmail).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanNewEmail)) {
        return res.status(400).json({ message: 'Invalid new email address' });
      }
      if (cleanNewEmail === user.email.toLowerCase()) {
        return res.status(400).json({ message: 'New email is the same as the current email' });
      }
      const existing = await models.User.findOne({ where: { email: cleanNewEmail } });
      if (existing) {
        return res.status(400).json({ message: 'That email is already in use by another account' });
      }
      req.body.newEmail = cleanNewEmail;
    }

    const newPasswordHash = wantsNewPassword ? await bcrypt.hash(newPassword, 12) : null;
    const token = buildVerifyToken({
      userId: user.id,
      currentEmail: user.email,
      newEmail: wantsNewEmail ? req.body.newEmail : null,
      newPasswordHash,
    });

    const base = resolveSiteBaseUrl();
    const verifyUrl = `${base}/verify-credential-change?token=${encodeURIComponent(token)}`;

    const changes = [];
    if (wantsNewEmail) changes.push(`your sign-in email address to <strong>${escapeHtml(req.body.newEmail)}</strong>`);
    if (wantsNewPassword) changes.push('your app password');

    await sendEmail({
      to: user.email,
      subject: 'Confirm your account change - Uttoron Coaching Centre',
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1F4F78">Confirm Account Change</h2>
          <p>Someone requested to change <strong>${escapeHtml(changes.join(' and '))}</strong> on your account (<strong>${escapeHtml(user.email)}</strong>).</p>
          <p>If this was you, click the button below to confirm. The change will NOT be applied until you confirm.</p>
          <p style="margin:24px 0">
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;border-radius:8px;text-decoration:none;color:#ffffff;background:#1F4F78;font-weight:bold;font-size:14px">Yes, it was me - Confirm Change</a>
          </p>
          <p style="color:#9ca3af;font-size:12px">This confirmation link expires in 30 minutes.</p>
          <p>If you did not request this, <strong>do not click the link</strong> and change your password immediately.</p>
        </div>
      `,
    });

    res.json({ message: 'Verification email sent. Click the confirm link in the email to apply the change.' });
  } catch (error) {
    console.error('CredentialChangeController.requestChange error:', error);
    res.status(500).json({ message: 'Failed to send verification email' });
  }
}

export async function verify(req, res) {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Missing verification token' });
    }

    let payload;
    try {
      payload = jwt.verify(token, authConfig.jwtSecret);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'This confirmation link is invalid or has expired. Request a new one.' });
    }

    if (!payload || payload.purpose !== 'credential_change' || !payload.userId) {
      return res.status(400).json({ success: false, message: 'This confirmation link is invalid or has expired. Request a new one.' });
    }

    const user = await models.User.findByPk(payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // The token must have been issued for the current email: if the email was
    // already changed since, a stale token can never be replayed to change it again.
    if (String(user.email).toLowerCase() !== String(payload.currentEmail || '').toLowerCase()) {
      return res.status(400).json({ success: false, message: 'This confirmation link is no longer valid for this account.' });
    }

    if (payload.newEmail) {
      const taken = await models.User.findOne({ where: { email: payload.newEmail } });
      if (taken && taken.id !== user.id) {
        return res.status(400).json({ success: false, message: 'The requested email is already in use by another account.' });
      }
      user.email = payload.newEmail;
    }

    if (payload.newPasswordHash) {
      user.password = payload.newPasswordHash;
    }

    await user.save();

    const applied = [];
    if (payload.newEmail) applied.push('email');
    if (payload.newPasswordHash) applied.push('password');

    const message = applied.length
      ? `Your ${applied.join(' and ')} ${applied.length > 1 ? 'have' : 'has'} been updated. Please log in again with the new credentials.`
      : 'Your credentials are unchanged. Please log in again.';

    res.json({ success: true, message });
  } catch (error) {
    console.error('CredentialChangeController.verify error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong while applying the change. Try again later.' });
  }
}
