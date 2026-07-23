import models from '../../models/index.js';
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
    res.status(500).json({ message: 'Failed to fetch courses', error: error.message });
  }
};

export const store = async (req, res) => {
  try {
    const {
      title, description, category, category_id, fee, discount_price,
      features, duration, seats, teacher_name, class_mode, sorting_order,
      is_featured, is_active,
    } = req.body;

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
    res.status(500).json({ message: 'Failed to create course', error: error.message });
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
    res.status(500).json({ message: 'Failed to fetch course', error: error.message });
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
    if (category !== undefined) updateData.category = category;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (fee !== undefined) updateData.fee = fee;
    if (discount_price !== undefined) updateData.discount_price = discount_price;
    if (features !== undefined) updateData.features = parseFeatures(features);
    if (duration !== undefined) updateData.duration = duration;
    if (seats !== undefined) updateData.seats = seats;
    if (teacher_name !== undefined) updateData.teacher_name = teacher_name;
    if (class_mode !== undefined) updateData.class_mode = class_mode;
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
    res.status(500).json({ message: 'Failed to update course', error: error.message });
  }
};

export const destroy = async (req, res) => {
  try {
    const course = await models.Course.findByPk(req.params.id, {
      include: [
        { model: models.Batch },
        { model: models.Exam },
      ],
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const examIds = (await models.Exam.findAll({ where: { course_id: course.id } })).map(e => e.id);
    if (examIds.length > 0) {
      await models.ExamResult.destroy({ where: { exam_id: { [Op.in]: examIds } } });
    }
    await models.Exam.destroy({ where: { course_id: course.id } });

    const batchIds = course.Batches ? course.Batches.map(b => b.id) : [];
    if (batchIds.length > 0) {
      const assignments = await models.Assignment.findAll({ where: { batch_id: { [Op.in]: batchIds } } });
      for (const a of assignments) {
        if (a.attachment_path) {
          await MediaDeleteService.deleteByUrl(a.attachment_path).catch(err => console.warn('Media cleanup:', err.message));
        }
        const submissions = await models.AssignmentSubmission.findAll({ where: { assignment_id: a.id } });
        for (const s of submissions) {
          if (s.submission_file_path) {
            await MediaDeleteService.deleteByUrl(s.submission_file_path).catch(err => console.warn('Media cleanup:', err.message));
          }
        }
      }
      const materials = await models.StudyMaterial.findAll({ where: { batch_id: { [Op.in]: batchIds } } });
      for (const m of materials) {
        if (m.file_path) {
          await MediaDeleteService.deleteByUrl(m.file_path).catch(err => console.warn('Media cleanup:', err.message));
        }
      }
      await models.TeacherBatchAssignment.destroy({ where: { batch_id: { [Op.in]: batchIds } } });
      await models.Routine.destroy({ where: { batch_id: { [Op.in]: batchIds } } });
      await models.Assignment.destroy({ where: { batch_id: { [Op.in]: batchIds } } });
      await models.StudyMaterial.destroy({ where: { batch_id: { [Op.in]: batchIds } } });
      await models.Student.update({ current_batch_id: null }, { where: { current_batch_id: { [Op.in]: batchIds } } });
      await models.Batch.destroy({ where: { id: { [Op.in]: batchIds } } });
    }

    await models.AdmissionApplication.update({ course_id: null }, { where: { course_id: course.id } });

    if (course.thumbnail) {
      await MediaDeleteService.deleteByUrl(course.thumbnail).catch(err => console.warn('Media cleanup:', err.message));
    }

    await course.destroy();

    res.json({ message: 'Course and related data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete course', error: error.message });
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
    res.status(500).json({ message: 'Failed to toggle active status', error: error.message });
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
    res.status(500).json({ message: 'Failed to toggle featured status', error: error.message });
  }
};
