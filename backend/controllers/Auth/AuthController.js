import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import models from '../../models/index.js';
import authConfig from '../../config/auth.js';
import { setAuthCookie, clearAuthCookie } from '../../services/cookie.js';
import { fn, col, where } from 'sequelize';
import { normalizeEmail } from '../../utils/normalizeEmail.js';
import { decodeUserId, verifySetupToken } from '../../services/passwordSetupToken.js';

// Pre-computed hash used only to equalize bcrypt timing when the email
// doesn't exist, so response time cannot be used to enumerate accounts.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', 12);

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Exact match first (uses the unique index, backward compatible), then a
    // case-insensitive fallback so a differently-cased email still signs in.
    // Exact-first also disambiguates any legacy case-variant duplicate rows.
    let user = await models.User.findOne({ where: { email } });
    if (!user) {
      user = await models.User.findOne({ where: where(fn('lower', col('email')), normalizeEmail(email)) });
    }

    // Same error (and same bcrypt cost) for: unknown email, wrong password,
    // and deactivated account — no account enumeration, no timing oracle.
    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !passwordOk || !user.is_active) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      // `tv` (token version) drives server-side revocation: a token is accepted
      // only while its `tv` matches the account's current User.token_version.
      { id: user.id, role: user.role, email: user.email, tv: user.token_version ?? 0 },
      authConfig.jwtSecret,
      { algorithm: 'HS256', expiresIn: authConfig.jwtExpiresIn }
    );

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      profile_photo_path: user.profile_photo_path,
    };

    // Also issue the token as a HttpOnly cookie (XSS hardening). The JSON
    // `token` is still returned so existing API clients keep working.
    setAuthCookie(res, token);
    res.json({ token, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function logout(req, res) {
  // Revoke every token for this account by bumping its token_version, then
  // clear the HttpOnly cookie. Wrapped defensively so logout always succeeds
  // (e.g. before the token_version column is migrated): the cookie is still
  // cleared and the client still drops its stored token.
  try {
    if (req.user?.id) {
      await models.User.increment('token_version', { where: { id: req.user.id } });
    }
  } catch (err) {
    console.error('Logout token-version bump failed:', err.message);
  }
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
}

export async function user(req, res) {
  try {
    const user = await models.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = { ...user.toJSON() };

    if (user.role === 'student') {
      const student = await models.Student.findOne({
        where: { user_id: user.id },
      });

      if (student) {
        const [batch, admission] = await Promise.all([
          student.current_batch_id
            ? models.Batch.findByPk(student.current_batch_id, {
                include: [{ model: models.Course }],
              })
            : null,
          student.admission_id
            ? models.AdmissionApplication.findByPk(student.admission_id, {
                include: [{ model: models.Course }],
              })
            : null,
        ]);

        const batchJson = batch ? batch.toJSON() : null;
        const admissionJson = admission ? admission.toJSON() : null;

        result.student_profile = {
          ...student.toJSON(),
          batch: batchJson
            ? { ...batchJson, course: batchJson.Course || null }
            : null,
          admission: admissionJson
            ? { ...admissionJson, course: admissionJson.Course || null }
            : null,
        };
      }
    } else if (user.role === 'teacher') {
      result.teacher_profile = await models.TeacherProfile.findOne({
        where: { user_id: user.id },
      });
    }

    res.json(result);
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// E5 — complete a one-time password setup/reset link. The emailed link carries
// a token bound to the account's current password hash (see
// services/passwordSetupToken.js); using it rotates the password, which
// invalidates the token (single-use) and bumps token_version to drop any
// existing sessions. No plaintext password is ever emailed.
export async function setPassword(req, res) {
  try {
    const { token, password } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Invalid or expired link' });
    }

    const { minLength, maxLength } = authConfig.passwordPolicy;
    if (typeof password !== 'string' || password.length < minLength || password.length > maxLength) {
      return res.status(400).json({ message: `Password must be between ${minLength} and ${maxLength} characters` });
    }

    const userId = decodeUserId(token);
    if (!userId) {
      return res.status(400).json({ message: 'Invalid or expired link' });
    }

    const account = await models.User.findByPk(userId);
    // Verify against the CURRENT hash: once a password is set the hash changes
    // and the link stops verifying, so it works exactly once.
    const check = account
      ? verifySetupToken(token, { passwordHash: account.password })
      : { valid: false };
    if (!account || !account.is_active || !check.valid) {
      const msg = check.expired ? 'This link has expired. Please request a new one.' : 'Invalid or expired link';
      return res.status(400).json({ message: msg });
    }

    account.password = await bcrypt.hash(password, 12);
    // Bump token_version so any session issued before the reset is revoked.
    if (Number.isInteger(account.token_version)) {
      account.token_version += 1;
    } else {
      account.token_version = 1;
    }
    await account.save();

    return res.json({ message: 'Password set successfully. You can now log in.' });
  } catch (error) {
    console.error('Set-password error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
