import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import models, { sequelize } from '../../models/index.js';
import authConfig from '../../config/auth.js';
import { sendEmail, escapeHtml, resolveSiteBaseUrl } from '../../services/mailer.js';

// Confirmation links carry an opaque, single-use random token — never a JWT,
// password, or bcrypt hash. The server stores only the SHA-256 of that token
// (plus the pending change), so no secret ever appears in a URL, query string,
// JWT claim, or log. Email changes are still confirmed from the current (old)
// mailbox so a hijacker who seizes the account cannot silently move it.
const VERIFY_TTL_MS = 30 * 60 * 1000; // 30 minutes
const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

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
      const existing = await models.User.findOne({ where: { email: cleanNewEmail }, paranoid: false });
      if (existing) {
        return res.status(400).json({ message: 'That email is already in use by another account' });
      }
      req.body.newEmail = cleanNewEmail;
    }

    const newPasswordHash = wantsNewPassword ? await bcrypt.hash(newPassword, 12) : null;

    // One outstanding request per user: drop any prior unconsumed tokens.
    await models.PendingCredentialChange.destroy({ where: { user_id: user.id, consumed_at: null } });

    // Opaque 256-bit single-use token; only its SHA-256 is persisted server-side.
    const rawToken = crypto.randomBytes(32).toString('hex');
    await models.PendingCredentialChange.create({
      user_id: user.id,
      new_email: wantsNewEmail ? req.body.newEmail : null,
      new_password_hash: newPasswordHash,
      token_hash: sha256(rawToken),
      expires_at: new Date(Date.now() + VERIFY_TTL_MS),
    });

    const base = resolveSiteBaseUrl();
    const verifyUrl = `${base}/verify-credential-change?token=${encodeURIComponent(rawToken)}`;

    const changes = [];
    if (wantsNewEmail) changes.push(`your sign-in email address to <strong>${escapeHtml(req.body.newEmail)}</strong>`);
    if (wantsNewPassword) changes.push('your app password');

    const mailResult = await sendEmail({
      to: user.email,
      subject: 'Confirm your account change - Shikhor Academy',
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

    if (!mailResult || !mailResult.messageId) {
      res.status(502).json({ message: 'The verification email could not be sent (SMTP delivery problem). Check the SMTP settings in Site Settings and try again.' });
      return;
    }

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

    const pending = await models.PendingCredentialChange.findOne({ where: { token_hash: sha256(token) } });

    // Unknown, already-consumed, and expired tokens all return the same generic
    // answer (no oracle). consumed_at enforces single use / replay protection.
    if (!pending || pending.consumed_at || new Date(pending.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'This confirmation link is invalid or has expired. Request a new one.' });
    }

    // The pending change is bound to exactly one user and one payload, so it
    // can never be applied to another account or another operation.
    const user = await models.User.findByPk(pending.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // If the requested email became occupied since the link was sent (including
    // by soft-deleted accounts, which the unique index still counts), fail with
    // a clear message instead of a 500.
    if (pending.new_email) {
      const taken = await models.User.findOne({ where: { email: pending.new_email }, paranoid: false });
      if (taken && taken.id !== user.id) {
        return res.status(400).json({ success: false, message: 'The requested email is already in use by another account.' });
      }
    }

    const applied = [];
    try {
      await sequelize.transaction(async (t) => {
        if (pending.new_email) {
          user.email = pending.new_email;
        }
        if (pending.new_password_hash) {
          // Already a bcrypt hash — the User beforeUpdate hook leaves $2a/$2b
          // values untouched, so it is stored as-is (never re-hashed).
          user.password = pending.new_password_hash;
        }
        // SEC-5: a confirmed credential change revokes all existing sessions.
        user.token_version = (user.token_version || 0) + 1;
        await user.save({ transaction: t });

        // Consume this token (single use) and clear any other outstanding ones.
        pending.consumed_at = new Date();
        await pending.save({ transaction: t });
        await models.PendingCredentialChange.destroy({
          where: { user_id: user.id, consumed_at: null },
          transaction: t,
        });

        if (pending.new_email) applied.push('email');
        if (pending.new_password_hash) applied.push('password');
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ success: false, message: 'The requested email is already in use by another account. Request a new change.' });
      }
      throw err;
    }

    const message = applied.length
      ? `Your ${applied.join(' and ')} ${applied.length > 1 ? 'have' : 'has'} been updated. Please log in again with the new credentials.`
      : 'Your credentials are unchanged. Please log in again.';

    res.json({ success: true, message });
  } catch (error) {
    console.error('CredentialChangeController.verify error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong while applying the change. Try again later.' });
  }
}
