import models, { sequelize } from '../../models/index.js';
import { Op } from 'sequelize';
import crypto from 'crypto';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';

const USER_SAFE_ATTRIBUTES = { exclude: ['password'] };

// One row per (teacher, batch, subject): a teacher can teach several subjects
// in the same batch, but the exact same batch+subject must not repeat.
const buildAssignmentRows = (teacherId, batchAssignments, batchIds) => {
  const source = Array.isArray(batchAssignments)
    ? batchAssignments.map(a => ({ batch_id: Number(a.batch_id), subject: a.subject }))
    : (Array.isArray(batchIds) ? batchIds.map(batch_id => ({ batch_id, subject: null })) : []);
  const seen = new Set();
  const rows = [];
  for (const a of source) {
    const subject = (a.subject || '').trim() || null;
    const key = `${a.batch_id}:${(subject || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ teacher_id: teacherId, batch_id: a.batch_id, subject });
  }
  return rows;
};

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
    if (Array.isArray(batch_assignments) || Array.isArray(batch_ids)) {
      assignmentRows = buildAssignmentRows(user.id, batch_assignments, batch_ids);
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

    // SEC-5: an admin-set password revokes the teacher's existing sessions.
    if (userData.password !== undefined) {
      await models.User.increment('token_version', { where: { id: teacher.id } });
    }

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
      const rows = buildAssignmentRows(teacher.id, batch_assignments, batch_ids);
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

    // H-del1: the teacher may have AUTHORED academic records whose owner column
    // is NOT NULL (Assignment.teacher_id) or that are academic history
    // (StudyMaterial, exam marks). Hard-deleting the account would orphan or
    // destroy them, so BLOCK the delete with a clear explanation and keep the
    // account + records intact. (A dedicated deactivate flow is the richer
    // alternative — see the tracker.)
    const [assignmentCount, materialCount, markCount] = await Promise.all([
      models.Assignment.count({ where: { teacher_id: teacher.id } }),
      models.StudyMaterial.count({ where: { uploaded_by: teacher.id } }),
      models.ExamResult.count({ where: { teacher_id: teacher.id } }),
    ]);
    if (assignmentCount + materialCount + markCount > 0) {
      return res.status(409).json({
        message: 'This teacher has authored assignments, study materials, or exam marks. The account was NOT deleted so academic history is preserved. Deactivate the teacher instead.',
        details: { assignments: assignmentCount, study_materials: materialCount, exam_marks: markCount },
      });
    }

    const photoPath = teacher.profile_photo_path;

    // H-del3: remove the account + its links atomically; roll back on any error.
    await sequelize.transaction(async (t) => {
      await models.TeacherBatchAssignment.destroy({ where: { teacher_id: teacher.id }, transaction: t });
      await models.TeacherProfile.destroy({ where: { user_id: teacher.id }, transaction: t });
      await models.Faculty.destroy({ where: { user_id: teacher.id }, transaction: t });
      // Nullable metadata stamps left by this teacher — null them so no row
      // points at a deleted account (these are not academic content).
      await models.Routine.update({ updated_by: null }, { where: { updated_by: teacher.id }, transaction: t });
      await models.Attendance.update({ leave_approved_by: null }, { where: { leave_approved_by: teacher.id }, transaction: t });
      await teacher.destroy({ transaction: t });
    });

    // Media cleanup is non-transactional; do it only after the row delete commits.
    if (photoPath) {
      await MediaDeleteService.deleteByUrl(photoPath).catch(err => console.warn('Media cleanup:', err.message));
    }

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('TeacherController.destroy error:', error);
    res.status(500).json({ message: 'Failed to delete teacher' });
  }
};
