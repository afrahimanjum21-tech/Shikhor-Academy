import models, { sequelize } from '../../models/index.js';
import { Op } from 'sequelize';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';

const makeSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
};

const parseFeatures = (features) => {
  if (!features) return null;
  if (typeof features === 'string') {
    try {
      return JSON.parse(features);
    } catch {
      return features.split('\n').filter(f => f.trim()).map(f => f.trim());
    }
  }
  return features;
};

export const index = async (req, res) => {
  try {
    const courses = await models.Course.findAll({
      include: [{ model: models.CourseCategory }],
      order: [['sorting_order', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json({ data: courses });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
};

export const store = async (req, res) => {
  try {
    const {
      title, description, category, category_id, fee, discount_price,
      features, duration, seats, teacher_name, class_mode, sorting_order,
      is_featured, is_active,
    } = req.body;

    // D14: a missing title must be a 4xx validation error, not a 500 from
    // makeSlug(undefined).toLowerCase().
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'title is required' });
    }

    const thumbnail = req.file ? (await MediaService.upload(req.file, { folder: 'courses' })).url : null;

    let slug = makeSlug(title);
    const existing = await models.Course.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const course = await models.Course.create({
      title,
      slug,
      description,
      category,
      category_id,
      fee,
      discount_price,
      thumbnail,
      features: parseFeatures(features),
      duration,
      seats,
      teacher_name,
      class_mode,
      sorting_order: sorting_order || 0,
      is_featured: is_featured === true || is_featured === 'true',
      is_active: is_active !== false && is_active !== 'false',
    });

    res.status(201).json({ message: 'Course created successfully', data: course });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create course' });
  }
};

export const show = async (req, res) => {
  try {
    const course = await models.Course.findByPk(req.params.id, {
      include: [
        { model: models.CourseCategory },
        { model: models.Batch },
        { model: models.Exam },
      ],
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({ data: course });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch course' });
  }
};

export const update = async (req, res) => {
  try {
    const course = await models.Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const {
      title, description, category, category_id, fee, discount_price,
      features, duration, seats, teacher_name, class_mode, sorting_order,
      is_featured, is_active,
    } = req.body;

    const updateData = {};
    if (title !== undefined) {
      updateData.title = title;
      let slug = makeSlug(title);
      const existing = await models.Course.findOne({ where: { slug, id: { [Op.ne]: course.id } } });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }
      updateData.slug = slug;
    }
    if (description !== undefined) updateData.description = description;
    // I-16: optional fields are clearable — a supplied empty string means
    // "clear this" (stored as NULL, never '' in an integer column); `undefined`
    // (field omitted) means "leave unchanged".
    const clearable = (v) => (v === '' ? null : v);
    if (category !== undefined) updateData.category = clearable(category);
    if (category_id !== undefined) updateData.category_id = clearable(category_id);
    if (fee !== undefined) updateData.fee = fee;
    if (discount_price !== undefined) updateData.discount_price = clearable(discount_price);
    if (features !== undefined) updateData.features = parseFeatures(features);
    if (duration !== undefined) updateData.duration = clearable(duration);
    if (seats !== undefined) updateData.seats = clearable(seats);
    if (teacher_name !== undefined) updateData.teacher_name = clearable(teacher_name);
    if (class_mode !== undefined) updateData.class_mode = clearable(class_mode);
    if (sorting_order !== undefined) updateData.sorting_order = sorting_order;
    if (is_featured !== undefined) updateData.is_featured = is_featured === true || is_featured === 'true';
    if (is_active !== undefined) updateData.is_active = is_active === true || is_active === 'true';

    if (req.file) {
      const result = await MediaService.upload(req.file, { folder: 'courses' });
      if (course.thumbnail) {
        await MediaDeleteService.deleteByUrl(course.thumbnail).catch(err => console.warn('Media cleanup:', err.message));
      }
      updateData.thumbnail = result.url;
    }

    await course.update(updateData);

    res.json({ message: 'Course updated successfully', data: course });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update course' });
  }
};

export const destroy = async (req, res) => {
  try {
    const course = await models.Course.findByPk(req.params.id, {
      include: [{ model: models.Batch }, { model: models.Exam }],
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const examIds = (await models.Exam.findAll({ where: { course_id: course.id }, attributes: ['id'] })).map(e => e.id);
    const batchIds = course.Batches ? course.Batches.map(b => b.id) : [];
    const assignments = batchIds.length
      ? await models.Assignment.findAll({ where: { batch_id: { [Op.in]: batchIds } }, attributes: ['id', 'attachment_path'] })
      : [];
    const assignmentIds = assignments.map(a => a.id);

    // H-del2: block the delete if ANY academic history exists under this course
    // — student submissions OR recorded exam marks — so it is never silently
    // destroyed. Structural data (batches/routines/materials) alone is deletable.
    const [resultCount, submissionCount] = await Promise.all([
      examIds.length ? models.ExamResult.count({ where: { exam_id: { [Op.in]: examIds } } }) : 0,
      assignmentIds.length ? models.AssignmentSubmission.count({ where: { assignment_id: { [Op.in]: assignmentIds } } }) : 0,
    ]);
    if (resultCount + submissionCount > 0) {
      return res.status(409).json({
        message: `This course has academic history (${resultCount} exam result(s), ${submissionCount} assignment submission(s)). Deleting it would destroy student marks/work — archive or deactivate the course instead.`,
      });
    }

    const materials = batchIds.length
      ? await models.StudyMaterial.findAll({ where: { batch_id: { [Op.in]: batchIds } }, attributes: ['id', 'file_path'] })
      : [];

    // H-del3: one transaction for every related table; roll back on any failure.
    await sequelize.transaction(async (t) => {
      if (assignmentIds.length) {
        await models.AssignmentSubmission.destroy({ where: { assignment_id: { [Op.in]: assignmentIds } }, transaction: t });
      }
      if (examIds.length) {
        await models.ExamResult.destroy({ where: { exam_id: { [Op.in]: examIds } }, transaction: t });
      }
      await models.Exam.destroy({ where: { course_id: course.id }, transaction: t });
      if (batchIds.length) {
        await models.TeacherBatchAssignment.destroy({ where: { batch_id: { [Op.in]: batchIds } }, transaction: t });
        await models.Routine.destroy({ where: { batch_id: { [Op.in]: batchIds } }, transaction: t });
        await models.Assignment.destroy({ where: { batch_id: { [Op.in]: batchIds } }, transaction: t });
        await models.StudyMaterial.destroy({ where: { batch_id: { [Op.in]: batchIds } }, transaction: t });
        await models.Student.update({ current_batch_id: null }, { where: { current_batch_id: { [Op.in]: batchIds } }, transaction: t });
        await models.Batch.destroy({ where: { id: { [Op.in]: batchIds } }, transaction: t });
      }
      await models.AdmissionApplication.update({ course_id: null }, { where: { course_id: course.id }, transaction: t });
      await course.destroy({ transaction: t });
    });

    // Media cleanup is non-transactional — run after the rows are gone.
    for (const a of assignments) {
      if (a.attachment_path) await MediaDeleteService.deleteByUrl(a.attachment_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    for (const m of materials) {
      if (m.file_path) await MediaDeleteService.deleteByUrl(m.file_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    if (course.thumbnail) {
      await MediaDeleteService.deleteByUrl(course.thumbnail).catch(err => console.warn('Media cleanup:', err.message));
    }

    res.json({ message: 'Course and related data deleted successfully' });
  } catch (error) {
    console.error('CourseController.destroy error:', error);
    res.status(500).json({ message: 'Failed to delete course' });
  }
};

export const toggleActive = async (req, res) => {
  try {
    const course = await models.Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    await course.update({ is_active: !course.is_active });
    res.json({ message: `Course ${course.is_active ? 'activated' : 'deactivated'}`, data: course });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle active status' });
  }
};

export const toggleFeatured = async (req, res) => {
  try {
    const course = await models.Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    await course.update({ is_featured: !course.is_featured });
    res.json({ message: `Course ${course.is_featured ? 'featured' : 'unfeatured'}`, data: course });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle featured status' });
  }
};
