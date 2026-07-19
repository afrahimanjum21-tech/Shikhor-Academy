import { Op } from 'sequelize';
import models from '../../models/index.js';

export async function index(req, res) {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = { is_active: true };
    if (category) where.category_id = category;

    const { count, rows } = await models.Course.findAndCountAll({
      where,
      include: [{ model: models.CourseCategory, as: 'CourseCategory' }],
      order: [['sorting_order', 'ASC'], ['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({
      courses: rows,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    console.error('Course index error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function categories(req, res) {
  try {
    const cats = await models.CourseCategory.findAll({
      where: { is_visible: true, is_active: true },
      order: [['display_order', 'ASC']],
    });
    res.json(cats);
  } catch (error) {
    console.error('Course categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function stats(req, res) {
  try {
    const totalCourses = await models.Course.count({ where: { is_active: true } });
    const totalCategories = await models.CourseCategory.count({ where: { is_active: true } });
    const totalBatches = await models.Batch.count();

    res.json({
      total_courses: totalCourses,
      total_categories: totalCategories,
      total_batches: totalBatches,
    });
  } catch (error) {
    console.error('Course stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function bySlug(req, res) {
  try {
    const course = await models.Course.findOne({
      where: { slug: req.params.slug, is_active: true },
      include: [
        { model: models.CourseCategory, as: 'CourseCategory' },
        { model: models.Batch, as: 'Batches' },
      ],
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Course bySlug error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function featured(req, res) {
  try {
    const courses = await models.Course.findAll({
      where: { is_featured: true, is_active: true },
      include: [{ model: models.CourseCategory, as: 'CourseCategory' }],
      order: [['sorting_order', 'ASC']],
      limit: 8,
    });
    res.json(courses);
  } catch (error) {
    console.error('Course featured error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function show(req, res) {
  try {
    const course = await models.Course.findByPk(req.params.id, {
      where: { is_active: true },
      include: [
        { model: models.CourseCategory, as: 'CourseCategory' },
        { model: models.Batch, as: 'Batches' },
      ],
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Course show error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
