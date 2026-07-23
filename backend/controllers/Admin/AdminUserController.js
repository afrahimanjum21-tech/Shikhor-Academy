import models from '../../models/index.js';
import { Op } from 'sequelize';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';

export const index = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = { role: 'student', deletedAt: null };
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { '$Student.student_id_card_no$': { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await models.User.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: models.Student,
          include: [
            { model: models.Batch, include: [{ model: models.Course, attributes: ['id', 'title'] }] },
          ],
        },
      ],
      offset,
      limit,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    res.json({
      data: rows,
      current_page: page,
      last_page: Math.ceil(count / limit),
      per_page: limit,
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch students', error: error.message });
  }
};

export const store = async (req, res) => {
  try {
    const {
      name, email, phone, password, profile_photo_path,
      guardian_phone, admission_date, gender, nationality, religion,
      blood_group, dob, father_name, father_phone, father_occupation, father_nid,
      mother_name, mother_phone, mother_occupation, mother_nid,
      present_address, permanent_address,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      last_school, jsc_roll, jsc_registration, jsc_gpa,
      ssc_roll, ssc_registration, ssc_gpa,
      shift, section, group_name, subject, current_batch_id,
    } = req.body;

    let photoPath = profile_photo_path;
    if (req.file) {
      const result = await MediaService.upload(req.file, { folder: 'users' });
      photoPath = result.url;
    }

    const user = await models.User.create({
      name, email, phone,
      password: password || process.env.DEFAULT_USER_PASSWORD || '123456',
      role: 'student',
      profile_photo_path: photoPath,
    });

    const student = await models.Student.create({
      user_id: user.id,
      guardian_phone,
      admission_date: admission_date || new Date().toISOString().split('T')[0],
      gender, nationality, religion, blood_group, dob,
      father_name, father_phone, father_occupation, father_nid,
      mother_name, mother_phone, mother_occupation, mother_nid,
      present_address, permanent_address,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      last_school, jsc_roll, jsc_registration, jsc_gpa,
      ssc_roll, ssc_registration, ssc_gpa,
      shift, section, group_name, subject, current_batch_id,
    });

    res.status(201).json({ message: 'Student created successfully', data: { user, student } });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create student', error: error.message });
  }
};

export const show = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await models.User.findOne({
      where: { id, role: 'student', deletedAt: null },
      include: [
        {
          model: models.Student,
          include: [
            { model: models.Batch, include: [{ model: models.Course }] },
            { model: models.ExamResult, include: [{ model: models.Exam }] },
            { model: models.Payment },
            { model: models.Attendance },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch student', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await models.User.findOne({
      where: { id, role: 'student', deletedAt: null },
      include: [{ model: models.Student }],
    });

    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const {
      name, email, phone, password,
      guardian_phone, admission_date, gender, nationality, religion,
      blood_group, dob, father_name, father_phone, father_occupation, father_nid,
      mother_name, mother_phone, mother_occupation, mother_nid,
      present_address, permanent_address,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      last_school, jsc_roll, jsc_registration, jsc_gpa,
      ssc_roll, ssc_registration, ssc_gpa,
      shift, section, group_name, subject, current_batch_id,
    } = req.body;

    const userData = {};
    if (name !== undefined) userData.name = name;
    if (email !== undefined) userData.email = email;
    if (phone !== undefined) userData.phone = phone;
    if (password !== undefined) userData.password = password;
    if (req.file) {
      const result = await MediaService.upload(req.file, { folder: 'users' });
      if (user.profile_photo_path) {
        await MediaDeleteService.deleteByUrl(user.profile_photo_path).catch(err => console.warn('Media cleanup:', err.message));
      }
      userData.profile_photo_path = result.url;
    }

    await user.update(userData);

    if (user.Student) {
      const studentData = {};
      if (guardian_phone !== undefined) studentData.guardian_phone = guardian_phone;
      if (admission_date !== undefined) studentData.admission_date = admission_date;
      if (gender !== undefined) studentData.gender = gender;
      if (nationality !== undefined) studentData.nationality = nationality;
      if (religion !== undefined) studentData.religion = religion;
      if (blood_group !== undefined) studentData.blood_group = blood_group;
      if (dob !== undefined) studentData.dob = dob;
      if (father_name !== undefined) studentData.father_name = father_name;
      if (father_phone !== undefined) studentData.father_phone = father_phone;
      if (father_occupation !== undefined) studentData.father_occupation = father_occupation;
      if (father_nid !== undefined) studentData.father_nid = father_nid;
      if (mother_name !== undefined) studentData.mother_name = mother_name;
      if (mother_phone !== undefined) studentData.mother_phone = mother_phone;
      if (mother_occupation !== undefined) studentData.mother_occupation = mother_occupation;
      if (mother_nid !== undefined) studentData.mother_nid = mother_nid;
      if (present_address !== undefined) studentData.present_address = present_address;
      if (permanent_address !== undefined) studentData.permanent_address = permanent_address;
      if (emergency_contact_name !== undefined) studentData.emergency_contact_name = emergency_contact_name;
      if (emergency_contact_phone !== undefined) studentData.emergency_contact_phone = emergency_contact_phone;
      if (emergency_contact_relation !== undefined) studentData.emergency_contact_relation = emergency_contact_relation;
      if (last_school !== undefined) studentData.last_school = last_school;
      if (jsc_roll !== undefined) studentData.jsc_roll = jsc_roll;
      if (jsc_registration !== undefined) studentData.jsc_registration = jsc_registration;
      if (jsc_gpa !== undefined) studentData.jsc_gpa = jsc_gpa;
      if (ssc_roll !== undefined) studentData.ssc_roll = ssc_roll;
      if (ssc_registration !== undefined) studentData.ssc_registration = ssc_registration;
      if (ssc_gpa !== undefined) studentData.ssc_gpa = ssc_gpa;
      if (shift !== undefined) studentData.shift = shift;
      if (section !== undefined) studentData.section = section;
      if (group_name !== undefined) studentData.group_name = group_name;
      if (subject !== undefined) studentData.subject = subject;
      if (current_batch_id !== undefined) studentData.current_batch_id = current_batch_id;

      await user.Student.update(studentData);
    }

    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update student', error: error.message });
  }
};

export const action = async (req, res) => {
  try {
    const { action: action_type, id } = req.params;

    const user = await models.User.findOne({
      where: { id, role: 'student', deletedAt: null },
    });

    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    switch (action_type) {
      case 'ban':
        await user.update({ is_active: false });
        return res.json({ message: 'Student banned successfully' });

      case 'activate':
        await user.update({ is_active: true });
        return res.json({ message: 'Student activated successfully' });

      case 'delete':
        if (user.profile_photo_path) {
          await MediaDeleteService.deleteByUrl(user.profile_photo_path).catch(err => console.warn('Media cleanup:', err.message));
        }
        await user.destroy();
        return res.json({ message: 'Student deleted successfully' });

      default:
        return res.status(400).json({ message: 'Invalid action type. Use: ban, activate, delete' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Action failed', error: error.message });
  }
};
