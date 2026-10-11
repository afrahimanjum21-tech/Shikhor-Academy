import models from '../../models/index.js';
import { Op } from 'sequelize';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';

const toBool = (value) => value === true || value === 'true' || value === '1' || value === 1;

const parseIdList = (value) => {
  if (value == null) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split(',').filter(Boolean);
    }
  }
  return [value];
};

const parseJsonField = (value) => {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const applySubjects = async (faculty, subjects) => {
  const ids = parseIdList(subjects);
  if (ids) {
    await faculty.setSubjects(Array.isArray(ids) ? ids : []);
  }
};

const applyBatches = async (faculty, batches) => {
  if (batches == null) return;
  let list = parseJsonField(batches);
  if (!Array.isArray(list)) list = null;
  const ids = (list || []).map(b => b && b.batch_id).filter(Boolean);
  await faculty.setBatches(ids);
  if (ids.length > 0) {
    const throughRows = await models.FacultyBatch.findAll({ where: { faculty_id: faculty.id } });
    for (const row of throughRows) {
      const match = (list || []).find(b => b && String(b.batch_id) === String(row.batch_id));
      await row.update({ subject: match && match.subject ? match.subject : null });
    }
  }
};

const serializeFaculty = (faculty) => {
  if (!faculty) return null;
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

const makeSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
};

const facultyInclude = [
  { model: models.Department, as: 'department' },
  { model: models.FacultyCategory, as: 'category' },
  { model: models.Subject, as: 'subjects', through: { attributes: [] } },
  { model: models.Batch, as: 'batches', through: { attributes: ['subject'] } },
  { model: models.FacultyGallery, as: 'galleries' },
  { model: models.User, as: 'user' },
];

export const index = async (req, res) => {
  try {
    const {
      search, department_id, faculty_category_id,
      is_featured, is_active, trashed,
    } = req.query;

    const where = {};
    if (department_id) where.department_id = department_id;
    if (faculty_category_id) where.faculty_category_id = faculty_category_id;
    if (is_featured === 'true') where.is_featured = true;
    else if (is_featured === 'false') where.is_featured = false;
    if (is_active === 'true') where.is_active = true;
    else if (is_active === 'false') where.is_active = false;

    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { employee_id: { [Op.like]: `%${search}%` } },
        { designation: { [Op.like]: `%${search}%` } },
      ];
    }

    const faculty = await models.Faculty.findAll({
      where,
      include: facultyInclude,
      order: [['display_order', 'ASC'], ['full_name', 'ASC']],
      paranoid: trashed === 'true' ? false : undefined,
    });
    res.json({ data: faculty.map(serializeFaculty) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch faculty' });
  }
};

export const show = async (req, res) => {
  try {
    const faculty = await models.Faculty.findByPk(req.params.id, {
      include: facultyInclude,
    });

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    res.json({ data: serializeFaculty(faculty) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch faculty' });
  }
};

export const store = async (req, res) => {
  try {
    const {
      full_name, employee_id, gender, dob, designation, department_id,
      faculty_category_id, specialization, qualification, teaching_experience,
      biography, awards, achievements, certifications, publications, research,
      qualifications, social_links,
      official_email, official_phone, public_profile_enabled, is_featured, is_active,
      display_order, meta_title, meta_description, subjects, subject_ids,
      batches, batch_ids, create_user_account, email, password,
    } = req.body;

    if (!full_name) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    let slug = makeSlug(full_name);
    const existing = await models.Faculty.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    let profile_photo_path = null;
    let cover_photo_path = null;
    if (req.files) {
      if (req.files.profile_photo) {
        const result = await MediaService.upload(req.files.profile_photo[0], { folder: 'faculty' });
        profile_photo_path = result.url;
      }
      if (req.files.cover_photo) {
        const result = await MediaService.upload(req.files.cover_photo[0], { folder: 'faculty' });
        cover_photo_path = result.url;
      }
    } else if (req.file) {
      const result = await MediaService.upload(req.file, { folder: 'faculty' });
      profile_photo_path = result.url;
    }

    const faculty = await models.Faculty.create({
      full_name, employee_id, slug,
      profile_photo_path, cover_photo_path,
      gender, dob: dob || null, designation,
      department_id: department_id || null,
      faculty_category_id: faculty_category_id || null,
      specialization, qualification, teaching_experience: teaching_experience || null, biography,
      awards: awards ? (typeof awards === 'string' ? JSON.parse(awards) : awards) : null,
      achievements: achievements ? (typeof achievements === 'string' ? JSON.parse(achievements) : achievements) : null,
      certifications: certifications ? (typeof certifications === 'string' ? JSON.parse(certifications) : certifications) : null,
      publications: publications ? (typeof publications === 'string' ? JSON.parse(publications) : publications) : null,
      qualifications: parseJsonField(qualifications),
      social_links: parseJsonField(social_links),
      research,
      official_email, official_phone,
      public_profile_enabled: toBool(public_profile_enabled),
      is_featured: toBool(is_featured),
      is_active: is_active === undefined ? true : toBool(is_active),
      display_order: display_order || 0,
      meta_title, meta_description,
    });

    await applySubjects(faculty, subjects !== undefined ? subjects : subject_ids);
    await applyBatches(faculty, batches !== undefined ? batches : batch_ids);

    if (toBool(create_user_account)) {
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required to create a teacher account' });
      }
      const existingUser = await models.User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }
      const user = await models.User.create({
        name: full_name,
        email,
        phone: official_phone,
        password,
        role: 'teacher',
      });
      await models.TeacherProfile.create({ user_id: user.id, designation });
      await faculty.update({ user_id: user.id });
    }

    const result = await models.Faculty.findByPk(faculty.id, { include: facultyInclude });

    res.status(201).json({ message: 'Faculty created successfully', data: serializeFaculty(result) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create faculty' });
  }
};

export const update = async (req, res) => {
  try {
    const faculty = await models.Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    const {
      full_name, employee_id, gender, dob, designation, department_id,
      faculty_category_id, specialization, qualification, teaching_experience,
      biography, awards, achievements, certifications, publications, research,
      qualifications, social_links,
      official_email, official_phone, public_profile_enabled, is_featured, is_active,
      display_order, meta_title, meta_description, subjects, subject_ids,
      batches, batch_ids, create_user_account, email, password,
    } = req.body;

    const updateData = {};
    if (full_name !== undefined) {
      updateData.full_name = full_name;
      let slug = makeSlug(full_name);
      const existing = await models.Faculty.findOne({ where: { slug, id: { [Op.ne]: faculty.id } } });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }
      updateData.slug = slug;
    }
    if (employee_id !== undefined) updateData.employee_id = employee_id;
    if (gender !== undefined) updateData.gender = gender;
    if (dob !== undefined) updateData.dob = dob || null;
    if (designation !== undefined) updateData.designation = designation;
    if (department_id !== undefined) updateData.department_id = department_id || null;
    if (faculty_category_id !== undefined) updateData.faculty_category_id = faculty_category_id || null;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (teaching_experience !== undefined) updateData.teaching_experience = teaching_experience || null;
    if (biography !== undefined) updateData.biography = biography;
    if (research !== undefined) updateData.research = research;
    if (official_email !== undefined) updateData.official_email = official_email;
    if (official_phone !== undefined) updateData.official_phone = official_phone;
    if (public_profile_enabled !== undefined) updateData.public_profile_enabled = toBool(public_profile_enabled);
    if (is_featured !== undefined) updateData.is_featured = toBool(is_featured);
    if (is_active !== undefined) updateData.is_active = toBool(is_active);
    if (display_order !== undefined) updateData.display_order = display_order;
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;

    if (awards !== undefined) updateData.awards = parseJsonField(awards);
    if (achievements !== undefined) updateData.achievements = parseJsonField(achievements);
    if (certifications !== undefined) updateData.certifications = parseJsonField(certifications);
    if (publications !== undefined) updateData.publications = parseJsonField(publications);
    if (qualifications !== undefined) updateData.qualifications = parseJsonField(qualifications);
    if (social_links !== undefined) updateData.social_links = parseJsonField(social_links);

    if (req.files) {
      if (req.files.profile_photo) {
        const result = await MediaService.upload(req.files.profile_photo[0], { folder: 'faculty' });
        if (faculty.profile_photo_path) {
          await MediaDeleteService.deleteByUrl(faculty.profile_photo_path).catch(err => console.warn('Media cleanup:', err.message));
        }
        updateData.profile_photo_path = result.url;
      }
      if (req.files.cover_photo) {
        const result = await MediaService.upload(req.files.cover_photo[0], { folder: 'faculty' });
        if (faculty.cover_photo_path) {
          await MediaDeleteService.deleteByUrl(faculty.cover_photo_path).catch(err => console.warn('Media cleanup:', err.message));
        }
        updateData.cover_photo_path = result.url;
      }
    } else if (req.file) {
      const result = await MediaService.upload(req.file, { folder: 'faculty' });
      if (faculty.profile_photo_path) {
        await MediaDeleteService.deleteByUrl(faculty.profile_photo_path).catch(err => console.warn('Media cleanup:', err.message));
      }
      updateData.profile_photo_path = result.url;
    }

    await faculty.update(updateData);

    await applySubjects(faculty, subjects !== undefined ? subjects : subject_ids);
    await applyBatches(faculty, batches !== undefined ? batches : batch_ids);

    if (faculty.user_id) {
      const user = await models.User.findByPk(faculty.user_id);
      if (user) {
        const userChanges = {};
        if (email && email !== user.email) {
          const dup = await models.User.findOne({ where: { email } });
          if (dup && dup.id !== user.id) {
            return res.status(400).json({ message: 'A user with this email already exists' });
          }
          userChanges.email = email;
        }
        if (password) userChanges.password = password;
        if (Object.keys(userChanges).length > 0) {
          await user.update(userChanges);
        }
      }
    } else if (toBool(create_user_account)) {
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required to create a teacher account' });
      }
      const existingUser = await models.User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this email already exists' });
      }
      const user = await models.User.create({
        name: faculty.full_name,
        email,
        password,
        role: 'teacher',
      });
      await models.TeacherProfile.create({ user_id: user.id, designation: faculty.designation });
      updateData.user_id = user.id;
      await faculty.update({ user_id: user.id });
    }

    const result = await models.Faculty.findByPk(faculty.id, { include: facultyInclude });

    res.json({ message: 'Faculty updated successfully', data: serializeFaculty(result) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update faculty' });
  }
};

export const destroy = async (req, res) => {
  try {
    const faculty = await models.Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    if (faculty.profile_photo_path) {
      await MediaDeleteService.deleteByUrl(faculty.profile_photo_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    if (faculty.cover_photo_path) {
      await MediaDeleteService.deleteByUrl(faculty.cover_photo_path).catch(err => console.warn('Media cleanup:', err.message));
    }

    // E1 safety fix: removing the PUBLIC Faculty card must NOT delete the linked
    // teacher's User account, TeacherProfile, or batch assignments — those are
    // the teacher record and its academic links, managed by the teacher-account
    // flow (TeacherController). Deleting them here destroyed accounts + wiped
    // teaching assignments just because an admin hid a public profile. We now
    // only soft-delete the Faculty card (Faculty is paranoid, so it can be
    // restored); the teacher account and all academic records are retained.
    await faculty.destroy();

    res.json({ message: 'Faculty profile removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete faculty' });
  }
};

export const restore = async (req, res) => {
  try {
    const faculty = await models.Faculty.findByPk(req.params.id, { paranoid: false });
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    if (!faculty.deletedAt) {
      return res.status(400).json({ message: 'Faculty is not deleted' });
    }

    await faculty.restore();

    const result = await models.Faculty.findByPk(faculty.id, { include: facultyInclude });

    res.json({ message: 'Faculty restored successfully', data: serializeFaculty(result) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restore faculty' });
  }
};

export const forceDelete = async (req, res) => {
  try {
    const faculty = await models.Faculty.findByPk(req.params.id, { paranoid: false });
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // E2: FacultyQualification/Achievement/Certification/SocialLink were
    // orphaned tables (data superseded by JSON columns on Faculty); their models
    // and tables are retired (see migration 017), so there are no child rows to
    // clean up here. Gallery / Subject / Batch are still live.
    await models.FacultyGallery.destroy({ where: { faculty_id: faculty.id }, force: true });
    await models.FacultySubject.destroy({ where: { faculty_id: faculty.id }, force: true });
    await models.FacultyBatch.destroy({ where: { faculty_id: faculty.id }, force: true });

    if (faculty.profile_photo_path) {
      await MediaDeleteService.deleteByUrl(faculty.profile_photo_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    if (faculty.cover_photo_path) {
      await MediaDeleteService.deleteByUrl(faculty.cover_photo_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    await faculty.destroy({ force: true });

    res.json({ message: 'Faculty permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to force delete faculty' });
  }
};

export const toggleFeatured = async (req, res) => {
  try {
    const faculty = await models.Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    await faculty.update({ is_featured: !faculty.is_featured });

    res.json({ message: `Faculty ${faculty.is_featured ? 'featured' : 'unfeatured'}`, data: faculty });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle featured status' });
  }
};

export const toggleActive = async (req, res) => {
  try {
    const faculty = await models.Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    await faculty.update({ is_active: !faculty.is_active });

    res.json({ message: `Faculty ${faculty.is_active ? 'activated' : 'deactivated'}`, data: faculty });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle active status' });
  }
};

export const reorder = async (req, res) => {
  try {
    const { orders } = req.body;

    if (!Array.isArray(orders)) {
      return res.status(400).json({ message: 'orders array is required' });
    }

    for (const item of orders) {
      if (item.id && item.display_order !== undefined) {
        await models.Faculty.update(
          { display_order: item.display_order },
          { where: { id: item.id } }
        );
      }
    }

    const faculty = await models.Faculty.findAll({
      include: facultyInclude,
      order: [['display_order', 'ASC'], ['full_name', 'ASC']],
    });

    res.json({ message: 'Order updated successfully', data: faculty });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reorder faculty' });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await models.Department.findAll({
      order: [['display_order', 'ASC'], ['name', 'ASC']],
    });
    res.json({ data: departments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const subjects = await models.Subject.findAll({
      order: [['display_order', 'ASC'], ['name', 'ASC']],
    });
    res.json({ data: subjects });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subjects' });
  }
};

export const getBatches = async (req, res) => {
  try {
    const batches = await models.Batch.findAll({
      include: [{ model: models.Course, attributes: ['id', 'title'] }],
      order: [['name', 'ASC']],
    });
    res.json({ data: batches });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch batches' });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await models.FacultyCategory.findAll({
      order: [['display_order', 'ASC'], ['name', 'ASC']],
    });
    res.json({ data: categories });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

export const storeCategory = async (req, res) => {
  try {
    const { name, description, is_active, display_order } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    let slug = makeSlug(name);
    const existing = await models.FacultyCategory.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const category = await models.FacultyCategory.create({
      name,
      slug,
      description,
      is_active: is_active !== false && is_active !== 'false',
      display_order: display_order || 0,
    });

    res.status(201).json({ message: 'Category created successfully', data: category });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create category' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await models.FacultyCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const { name, description, is_active, display_order } = req.body;

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name;
      let slug = makeSlug(name);
      const existing = await models.FacultyCategory.findOne({ where: { slug, id: { [Op.ne]: category.id } } });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }
      updateData.slug = slug;
    }
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active === true || is_active === 'true';
    if (display_order !== undefined) updateData.display_order = display_order;

    await category.update(updateData);

    res.json({ message: 'Category updated successfully', data: category });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update category' });
  }
};

export const destroyCategory = async (req, res) => {
  try {
    const category = await models.FacultyCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const facultyCount = await models.Faculty.count({ where: { faculty_category_id: category.id } });
    if (facultyCount > 0) {
      return res.status(400).json({ message: 'Cannot delete category with associated faculty members' });
    }

    await category.destroy();

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete category' });
  }
};
