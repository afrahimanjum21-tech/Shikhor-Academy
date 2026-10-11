import { Op } from 'sequelize';
import models from '../../models/index.js';

export async function index(req, res) {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = { is_active: true };
    if (category) where.category_id = category;

    // findAndCountAll counted with the JOIN included, doubling the query cost.
    const [rows, count] = await Promise.all([
      models.Course.findAll({
        where,
        include: [{ model: models.CourseCategory, as: 'CourseCategory' }],
        order: [['sorting_order', 'ASC'], ['createdAt', 'DESC']],
        limit: parseInt(limit, 10),
        offset,
      }),
      models.Course.count({ where }),
    ]);

    res.json({
      data: rows,
      current_page: parseInt(page, 10),
      last_page: Math.ceil(count / parseInt(limit, 10)),
      total: count,
      per_page: parseInt(limit, 10),
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
    // Six sequential queries (~1.9s) collapsed into one parallel batch.
    const [totalCourses, totalCategories, totalBatches, totalStudents, totalTeachers, siteSetting] = await Promise.all([
      models.Course.count({ where: { is_active: true } }),
      models.CourseCategory.count({ where: { is_active: true } }),
      models.Batch.count(),
      models.Student.count({
        include: [{
          model: models.User,
          as: 'User',
          where: { is_active: true },
        }],
      }),
      models.TeacherProfile.count({
        include: [{
          model: models.User,
          as: 'User',
          where: { is_active: true },
        }],
      }),
      models.SiteSetting.findByPk(1),
    ]);

    res.json({
      courses: totalCourses,
      total_courses: totalCourses,
      students: totalStudents || 0,
      teachers: totalTeachers || 0,
      success_rate: siteSetting?.success_rate || 0,
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
        { model: models.Batch, as: 'Batches', attributes: ['id', 'name', 'start_time', 'end_time', 'capacity'] },
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
    // D15: findByPk ignores the `where` option, so the intended is_active filter
    // was silently dropped — an inactive course could leak through if this
    // handler is ever routed. Use findOne so the filter actually applies.
    const course = await models.Course.findOne({
      where: { id: req.params.id, is_active: true },
      include: [
        { model: models.CourseCategory, as: 'CourseCategory' },
        { model: models.Batch, as: 'Batches', attributes: ['id', 'name', 'start_time', 'end_time', 'capacity'] },
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
