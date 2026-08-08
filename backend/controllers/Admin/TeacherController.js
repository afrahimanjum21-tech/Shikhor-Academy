import models from '../../models/index.js';
import crypto from 'crypto';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';

const USER_SAFE_ATTRIBUTES = { exclude: ['password'] };

export const index = async (req, res) => {
  try {
    const teachers = await models.User.findAll({
      where: { role: 'teacher', deletedAt: null },
      attributes: USER_SAFE_ATTRIBUTES,
      include: [
        { model: models.TeacherProfile },
        {
          model: models.TeacherBatchAssignment,
          include: [{ model: models.Batch, include: [{ model: models.Course }] }],
        },
        { model: models.Faculty },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ data: teachers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch teachers' });
  }
};

export const store = async (req, res) => {
  try {
    const {
      name, email, phone, password,
      designation, subject, bio, joining_date,
      batch_ids, batch_assignments, ...facultyFields
    } = req.body;

    // Never silently fall back to a public weak password — generate a random
    // one and surface it once in the response so the admin can share it.
    const generatedPassword = password
      ? null
      : (process.env.DEFAULT_USER_PASSWORD || crypto.randomBytes(5).toString('hex'));

    const user = await models.User.create({
      name, email, phone,
      password: generatedPassword || password,
      role: 'teacher',
    });

    await models.TeacherProfile.create({
      user_id: user.id,
      designation,
      subject,
      bio,
      joining_date: joining_date || new Date().toISOString().split('T')[0],
    });

    let assignmentRows = [];
    if (Array.isArray(batch_assignments)) {
      assignmentRows = batch_assignments.map(a => ({
        teacher_id: user.id,
        batch_id: Number(a.batch_id),
        subject: a.subject,
      }));
    } else if (Array.isArray(batch_ids)) {
      assignmentRows = batch_ids.map(batch_id => ({
        teacher_id: user.id,
        batch_id,
      }));
    }
    if (assignmentRows.length > 0) {
      await models.TeacherBatchAssignment.bulkCreate(assignmentRows);
    }

    await models.Faculty.create({
      user_id: user.id,
      full_name: name,
      designation,
      employee_id: facultyFields.employee_id || `TCH-${String(user.id).padStart(4, '0')}`,
    });

    const { password: _pw, ...safeUser } = user.toJSON();
    if (generatedPassword && !process.env.DEFAULT_USER_PASSWORD) safeUser.temp_password = generatedPassword;
    res.status(201).json({ message: 'Teacher created successfully', data: safeUser });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create teacher' });
  }
};

export const show = async (req, res) => {
  try {
    const teacher = await models.User.findOne({
      where: { id: req.params.id, role: 'teacher', deletedAt: null },
      attributes: USER_SAFE_ATTRIBUTES,
      include: [
        { model: models.TeacherProfile },
        {
          model: models.TeacherBatchAssignment,
          include: [{ model: models.Batch, include: [{ model: models.Course }] }],
        },
        { model: models.Faculty },
      ],
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.json({ data: teacher });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch teacher' });
  }
};

export const update = async (req, res) => {
  try {
    const teacher = await models.User.findOne({
      where: { id: req.params.id, role: 'teacher', deletedAt: null },
      attributes: USER_SAFE_ATTRIBUTES,
      include: [
        { model: models.TeacherProfile },
        { model: models.Faculty },
      ],
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const { name, email, phone, password, designation, subject, bio, joining_date, batch_ids, batch_assignments, ...facultyFields } = req.body;

    const userData = {};
    if (name !== undefined) userData.name = name;
    if (email !== undefined) userData.email = email;
    if (phone !== undefined) userData.phone = phone;
    if (password !== undefined) userData.password = password;
    await teacher.update(userData);

    if (teacher.TeacherProfile) {
      const profileData = {};
      if (designation !== undefined) profileData.designation = designation;
      if (subject !== undefined) profileData.subject = subject;
      if (bio !== undefined) profileData.bio = bio;
      if (joining_date !== undefined) profileData.joining_date = joining_date;
      await teacher.TeacherProfile.update(profileData);
    }

    if (teacher.Faculty) {
      const facultyData = {};
      if (name !== undefined) facultyData.full_name = name;
      if (designation !== undefined) facultyData.designation = designation;
      await teacher.Faculty.update(facultyData);
    }

    if (Array.isArray(batch_ids) || Array.isArray(batch_assignments)) {
      await models.TeacherBatchAssignment.destroy({ where: { teacher_id: teacher.id } });
      let rows = [];
      if (Array.isArray(batch_assignments)) {
        rows = batch_assignments.map(a => ({
          teacher_id: teacher.id,
          batch_id: Number(a.batch_id),
          subject: a.subject,
        }));
      } else if (batch_ids.length > 0) {
        rows = batch_ids.map(batch_id => ({
          teacher_id: teacher.id,
          batch_id,
        }));
      }
      if (rows.length > 0) {
        await models.TeacherBatchAssignment.bulkCreate(rows);
      }
    }

    res.json({ message: 'Teacher updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update teacher' });
  }
};

export const updatePhoto = async (req, res) => {
  try {
    const teacher = await models.User.findOne({
      where: { id: req.params.id, role: 'teacher', deletedAt: null },
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No photo file provided' });
    }

    const result = await MediaService.upload(req.file, { folder: 'faculty' });

    if (teacher.profile_photo_path) {
      await MediaDeleteService.deleteByUrl(teacher.profile_photo_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    await teacher.update({ profile_photo_path: result.url });

    res.json({ message: 'Photo updated successfully', data: { profile_photo_path: result.url } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update photo' });
  }
};

export const destroy = async (req, res) => {
  try {
    const teacher = await models.User.findOne({
      where: { id: req.params.id, role: 'teacher', deletedAt: null },
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (teacher.profile_photo_path) {
      await MediaDeleteService.deleteByUrl(teacher.profile_photo_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    await models.TeacherBatchAssignment.destroy({ where: { teacher_id: teacher.id } });
    await models.TeacherProfile.destroy({ where: { user_id: teacher.id } });
    await models.Faculty.destroy({ where: { user_id: teacher.id } });
    await teacher.destroy();

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete teacher' });
  }
};
