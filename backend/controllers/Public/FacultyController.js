import { Op } from 'sequelize';
import models from '../../models/index.js';

const facultyIncludes = [
  { model: models.Department, as: 'department' },
  { model: models.FacultyCategory, as: 'category' },
  { model: models.Subject, as: 'subjects', through: { attributes: [] } },
  { model: models.Batch, as: 'batches', through: { attributes: ['subject'] } },
  { model: models.FacultyGallery, as: 'galleries', order: [['display_order', 'ASC']] },
  { model: models.User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'profile_photo_path'] },
];

const serializeFaculty = (faculty) => {
  const json = faculty.toJSON ? faculty.toJSON() : faculty;
  if (Array.isArray(json.batches)) {
    json.batches = json.batches.map(b => {
      b.subject = b.FacultyBatch ? b.FacultyBatch.subject || null : b.subject || null;
      delete b.FacultyBatch;
      return b;
    });
  }
  return json;
};

const listIncludes = [
  { model: models.Department, as: 'department' },
  { model: models.FacultyCategory, as: 'category' },
  { model: models.Subject, as: 'subjects', through: { attributes: [] } },
  { model: models.Batch, as: 'batches', through: { attributes: ['subject'] } },
];

export async function index(req, res) {
  try {
    const { department, category, subject_id, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = { is_active: true, public_profile_enabled: true };
    if (department) where.department_id = department;
    if (category) where.faculty_category_id = category;

    const include = [...listIncludes];
    if (subject_id) include[2].where = { id: subject_id };

    const { count, rows } = await models.Faculty.findAndCountAll({
      where,
      include,
      distinct: true,
      order: [['display_order', 'ASC'], ['full_name', 'ASC']],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({
      data: rows.map(serializeFaculty),
      current_page: parseInt(page, 10),
      last_page: Math.ceil(count / parseInt(limit, 10)),
      total: count,
      per_page: parseInt(limit, 10),
    });
  } catch (error) {
    console.error('Faculty index error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function featured(req, res) {
  try {
    const faculty = await models.Faculty.findAll({
      where: { is_featured: true, is_active: true, public_profile_enabled: true },
      include: listIncludes,
      order: [['display_order', 'ASC']],
      limit: 8,
    });
    res.json(faculty.map(serializeFaculty));
  } catch (error) {
    console.error('Faculty featured error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function show(req, res) {
  try {
    const member = await models.Faculty.findOne({
      where: { slug: req.params.slug, is_active: true, public_profile_enabled: true },
      include: facultyIncludes,
    });

    if (!member) {
      return res.status(404).json({ message: 'Faculty member not found' });
    }

    res.json(serializeFaculty(member));
  } catch (error) {
    console.error('Faculty show error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function categories(req, res) {
  try {
    const cats = await models.FacultyCategory.findAll({
      where: { is_active: true },
      order: [['display_order', 'ASC']],
    });
    res.json(cats);
  } catch (error) {
    console.error('Faculty categories error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function departments(req, res) {
  try {
    const depts = await models.Department.findAll({
      where: { is_active: true },
      order: [['display_order', 'ASC']],
    });
    res.json(depts);
  } catch (error) {
    console.error('Faculty departments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function subjects(req, res) {
  try {
    const subs = await models.Subject.findAll({
      where: { is_active: true },
      order: [['display_order', 'ASC'], ['name', 'ASC']],
    });
    res.json(subs);
  } catch (error) {
    console.error('Faculty subjects error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function search(req, res) {
  try {
    const { q, department, category, subject_id, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where = { is_active: true, public_profile_enabled: true };
    const orConditions = [];

    if (q) {
      orConditions.push(
        { full_name: { [Op.like]: `%${q}%` } },
        { designation: { [Op.like]: `%${q}%` } },
        { specialization: { [Op.like]: `%${q}%` } },
        { biography: { [Op.like]: `%${q}%` } },
      );
    }

    if (orConditions.length > 0) {
      where[Op.or] = orConditions;
    }

    if (department) where.department_id = department;
    if (category) where.faculty_category_id = category;

    const include = [...listIncludes];
    if (subject_id) include[2].where = { id: subject_id };

    const { count, rows } = await models.Faculty.findAndCountAll({
      where,
      include,
      distinct: true,
      order: [['display_order', 'ASC'], ['full_name', 'ASC']],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({
      data: rows.map(serializeFaculty),
      current_page: parseInt(page, 10),
      last_page: Math.ceil(count / parseInt(limit, 10)),
      total: count,
      per_page: parseInt(limit, 10),
    });
  } catch (error) {
    console.error('Faculty search error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
