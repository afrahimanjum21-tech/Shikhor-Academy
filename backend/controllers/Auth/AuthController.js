import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import models from '../../models/index.js';
import authConfig from '../../config/auth.js';
import { setAuthCookie, clearAuthCookie } from '../../services/cookie.js';

// Pre-computed hash used only to equalize bcrypt timing when the email
// doesn't exist, so response time cannot be used to enumerate accounts.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', 12);

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await models.User.findOne({ where: { email } });

    // Same error (and same bcrypt cost) for: unknown email, wrong password,
    // and deactivated account — no account enumeration, no timing oracle.
    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !passwordOk || !user.is_active) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
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
  // Clear the HttpOnly auth cookie alongside any client-side token removal.
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
