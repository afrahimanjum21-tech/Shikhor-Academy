import models from '../../models/index.js';

export const index = async (req, res) => {
  try {
    const teachers = await models.User.findAll({
      where: { role: 'teacher', deletedAt: null },
      include: [
        { model: models.TeacherProfile },
        {
          model: models.TeacherBatchAssignment,
          include: [{ model: models.Batch }],
        },
        { model: models.Faculty },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ data: teachers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch teachers', error: error.message });
  }
};

export const store = async (req, res) => {
  try {
    const {
      name, email, phone, password,
      designation, subject, bio, joining_date,
      batch_ids, ...facultyFields
    } = req.body;

    const user = await models.User.create({
      name, email, phone,
      password: password || '123456',
      role: 'teacher',
    });

    await models.TeacherProfile.create({
      user_id: user.id,
      designation,
      subject,
      bio,
      joining_date: joining_date || new Date().toISOString().split('T')[0],
    });

    if (Array.isArray(batch_ids) && batch_ids.length > 0) {
      const assignments = batch_ids.map(batch_id => ({
        teacher_id: user.id,
        batch_id,
      }));
      await models.TeacherBatchAssignment.bulkCreate(assignments);
    }

    await models.Faculty.create({
      user_id: user.id,
      full_name: name,
      designation,
      employee_id: facultyFields.employee_id || `TCH-${String(user.id).padStart(4, '0')}`,
    });

    res.status(201).json({ message: 'Teacher created successfully', data: user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create teacher', error: error.message });
  }
};

export const show = async (req, res) => {
  try {
    const teacher = await models.User.findOne({
      where: { id: req.params.id, role: 'teacher', deletedAt: null },
      include: [
        { model: models.TeacherProfile },
        {
          model: models.TeacherBatchAssignment,
          include: [{ model: models.Batch }],
        },
        { model: models.Faculty },
      ],
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    res.json({ data: teacher });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch teacher', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const teacher = await models.User.findOne({
      where: { id: req.params.id, role: 'teacher', deletedAt: null },
      include: [
        { model: models.TeacherProfile },
        { model: models.Faculty },
      ],
    });

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const { name, email, phone, password, designation, subject, bio, joining_date, batch_ids, ...facultyFields } = req.body;

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

    if (Array.isArray(batch_ids)) {
      await models.TeacherBatchAssignment.destroy({ where: { teacher_id: teacher.id } });
      if (batch_ids.length > 0) {
        const assignments = batch_ids.map(batch_id => ({
          teacher_id: teacher.id,
          batch_id,
        }));
        await models.TeacherBatchAssignment.bulkCreate(assignments);
      }
    }

    res.json({ message: 'Teacher updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update teacher', error: error.message });
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

    const photoPath = req.file.path.replace(/\\/g, '/');
    await teacher.update({ profile_photo_path: photoPath });

    res.json({ message: 'Photo updated successfully', data: { profile_photo_path: photoPath } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update photo', error: error.message });
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

    await models.TeacherBatchAssignment.destroy({ where: { teacher_id: teacher.id } });
    await models.TeacherProfile.destroy({ where: { user_id: teacher.id } });
    await models.Faculty.destroy({ where: { user_id: teacher.id } });
    await teacher.destroy();

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete teacher', error: error.message });
  }
};
