import models from '../../models/index.js';
import { Op } from 'sequelize';

const makeSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
};

const facultyInclude = [
  { model: models.Department },
  { model: models.FacultyCategory },
  { model: models.FacultyQualification },
  { model: models.FacultyAchievement },
  { model: models.FacultyCertification },
  { model: models.FacultySocialLink },
  { model: models.FacultyGallery },
  { model: models.Subject, through: { attributes: [] } },
  { model: models.Batch, through: { attributes: ['subject'] } },
];

export const index = async (req, res) => {
  try {
    const faculty = await models.Faculty.findAll({
      include: facultyInclude,
      order: [['display_order', 'ASC'], ['full_name', 'ASC']],
    });
    res.json({ data: faculty });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch faculty', error: error.message });
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

    res.json({ data: faculty });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch faculty', error: error.message });
  }
};

export const store = async (req, res) => {
  try {
    const {
      full_name, employee_id, gender, dob, designation, department_id,
      faculty_category_id, specialization, qualification, teaching_experience,
      biography, awards, achievements, certifications, publications, research,
      official_email, official_phone, public_profile_enabled, is_featured, is_active,
      display_order, meta_title, meta_description, subject_ids, batch_ids,
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
        profile_photo_path = req.files.profile_photo[0].path.replace(/\\/g, '/');
      }
      if (req.files.cover_photo) {
        cover_photo_path = req.files.cover_photo[0].path.replace(/\\/g, '/');
      }
    } else if (req.file) {
      profile_photo_path = req.file.path.replace(/\\/g, '/');
    }

    const faculty = await models.Faculty.create({
      full_name, employee_id, slug,
      profile_photo_path, cover_photo_path,
      gender, dob, designation, department_id, faculty_category_id,
      specialization, qualification, teaching_experience, biography,
      awards: awards ? (typeof awards === 'string' ? JSON.parse(awards) : awards) : null,
      achievements: achievements ? (typeof achievements === 'string' ? JSON.parse(achievements) : achievements) : null,
      certifications: certifications ? (typeof certifications === 'string' ? JSON.parse(certifications) : certifications) : null,
      publications: publications ? (typeof publications === 'string' ? JSON.parse(publications) : publications) : null,
      research,
      official_email, official_phone,
      public_profile_enabled: public_profile_enabled === true || public_profile_enabled === 'true',
      is_featured: is_featured === true || is_featured === 'true',
      is_active: is_active !== false && is_active !== 'false',
      display_order: display_order || 0,
      meta_title, meta_description,
    });

    if (subject_ids) {
      const ids = typeof subject_ids === 'string' ? JSON.parse(subject_ids) : subject_ids;
      if (Array.isArray(ids) && ids.length > 0) {
        await faculty.setSubjects(ids);
      }
    }

    if (batch_ids) {
      const ids = typeof batch_ids === 'string' ? JSON.parse(batch_ids) : batch_ids;
      if (Array.isArray(ids) && ids.length > 0) {
        await faculty.setBatches(ids);
      }
    }

    const result = await models.Faculty.findByPk(faculty.id, { include: facultyInclude });

    res.status(201).json({ message: 'Faculty created successfully', data: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create faculty', error: error.message });
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
      official_email, official_phone, public_profile_enabled, is_featured, is_active,
      display_order, meta_title, meta_description, subject_ids, batch_ids,
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
    if (dob !== undefined) updateData.dob = dob;
    if (designation !== undefined) updateData.designation = designation;
    if (department_id !== undefined) updateData.department_id = department_id;
    if (faculty_category_id !== undefined) updateData.faculty_category_id = faculty_category_id;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (teaching_experience !== undefined) updateData.teaching_experience = teaching_experience;
    if (biography !== undefined) updateData.biography = biography;
    if (research !== undefined) updateData.research = research;
    if (official_email !== undefined) updateData.official_email = official_email;
    if (official_phone !== undefined) updateData.official_phone = official_phone;
    if (public_profile_enabled !== undefined) updateData.public_profile_enabled = public_profile_enabled === true || public_profile_enabled === 'true';
    if (is_featured !== undefined) updateData.is_featured = is_featured === true || is_featured === 'true';
    if (is_active !== undefined) updateData.is_active = is_active === true || is_active === 'true';
    if (display_order !== undefined) updateData.display_order = display_order;
    if (meta_title !== undefined) updateData.meta_title = meta_title;
    if (meta_description !== undefined) updateData.meta_description = meta_description;

    if (awards !== undefined) updateData.awards = typeof awards === 'string' ? JSON.parse(awards) : awards;
    if (achievements !== undefined) updateData.achievements = typeof achievements === 'string' ? JSON.parse(achievements) : achievements;
    if (certifications !== undefined) updateData.certifications = typeof certifications === 'string' ? JSON.parse(certifications) : certifications;
    if (publications !== undefined) updateData.publications = typeof publications === 'string' ? JSON.parse(publications) : publications;

    if (req.files) {
      if (req.files.profile_photo) {
        updateData.profile_photo_path = req.files.profile_photo[0].path.replace(/\\/g, '/');
      }
      if (req.files.cover_photo) {
        updateData.cover_photo_path = req.files.cover_photo[0].path.replace(/\\/g, '/');
      }
    } else if (req.file) {
      updateData.profile_photo_path = req.file.path.replace(/\\/g, '/');
    }

    await faculty.update(updateData);

    if (subject_ids !== undefined) {
      const ids = typeof subject_ids === 'string' ? JSON.parse(subject_ids) : subject_ids;
      await faculty.setSubjects(Array.isArray(ids) ? ids : []);
    }

    if (batch_ids !== undefined) {
      const ids = typeof batch_ids === 'string' ? JSON.parse(batch_ids) : batch_ids;
      await faculty.setBatches(Array.isArray(ids) ? ids : []);
    }

    const result = await models.Faculty.findByPk(faculty.id, { include: facultyInclude });

    res.json({ message: 'Faculty updated successfully', data: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update faculty', error: error.message });
  }
};

export const destroy = async (req, res) => {
  try {
    const faculty = await models.Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    await faculty.destroy();

    res.json({ message: 'Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete faculty', error: error.message });
  }
};

export const restore = async (req, res) => {
  try {
    const faculty = await models.Faculty.findByPk(req.params.id, { paranoid: false });
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    if (!faculty.deleted_at) {
      return res.status(400).json({ message: 'Faculty is not deleted' });
    }

    await faculty.restore();

    const result = await models.Faculty.findByPk(faculty.id, { include: facultyInclude });

    res.json({ message: 'Faculty restored successfully', data: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restore faculty', error: error.message });
  }
};

export const forceDelete = async (req, res) => {
  try {
    const faculty = await models.Faculty.findByPk(req.params.id, { paranoid: false });
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    await models.FacultyQualification.destroy({ where: { faculty_id: faculty.id }, force: true });
    await models.FacultyAchievement.destroy({ where: { faculty_id: faculty.id }, force: true });
    await models.FacultyCertification.destroy({ where: { faculty_id: faculty.id }, force: true });
    await models.FacultySocialLink.destroy({ where: { faculty_id: faculty.id }, force: true });
    await models.FacultyGallery.destroy({ where: { faculty_id: faculty.id }, force: true });
    await models.FacultySubject.destroy({ where: { faculty_id: faculty.id }, force: true });
    await models.FacultyBatch.destroy({ where: { faculty_id: faculty.id }, force: true });

    await faculty.destroy({ force: true });

    res.json({ message: 'Faculty permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to force delete faculty', error: error.message });
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
    res.status(500).json({ message: 'Failed to toggle featured status', error: error.message });
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
    res.status(500).json({ message: 'Failed to toggle active status', error: error.message });
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
    res.status(500).json({ message: 'Failed to reorder faculty', error: error.message });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await models.Department.findAll({
      order: [['display_order', 'ASC'], ['name', 'ASC']],
    });
    res.json({ data: departments });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch departments', error: error.message });
  }
};

export const getSubjects = async (req, res) => {
  try {
    const subjects = await models.Subject.findAll({
      order: [['display_order', 'ASC'], ['name', 'ASC']],
    });
    res.json({ data: subjects });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subjects', error: error.message });
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
    res.status(500).json({ message: 'Failed to fetch batches', error: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await models.FacultyCategory.findAll({
      order: [['display_order', 'ASC'], ['name', 'ASC']],
    });
    res.json({ data: categories });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
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
    res.status(500).json({ message: 'Failed to create category', error: error.message });
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
    res.status(500).json({ message: 'Failed to update category', error: error.message });
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
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
};
