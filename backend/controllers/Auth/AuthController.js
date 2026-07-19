import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import models from '../../models/index.js';
import authConfig from '../../config/auth.js';

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await models.User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated. Contact administrator.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
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

    res.json({ token, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function logout(req, res) {
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
      result.student = await models.Student.findOne({
        where: { user_id: user.id },
        include: [
          { model: models.Batch, as: 'Batch' },
          { model: models.AdmissionApplication, as: 'AdmissionApplication' },
        ],
      });
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
