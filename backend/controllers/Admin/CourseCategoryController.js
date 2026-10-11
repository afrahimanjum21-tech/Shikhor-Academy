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

export const index = async (req, res) => {
  try {
    const categories = await models.CourseCategory.findAll({
      order: [['display_order', 'ASC'], ['name', 'ASC']],
    });
    res.json({ data: categories });
  } catch (error) {
    console.error('CourseCategoryController error:', error.message);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

export const store = async (req, res) => {
  try {
    const { name, icon, color, display_order, is_visible, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    let slug = makeSlug(name);
    const existing = await models.CourseCategory.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const category = await models.CourseCategory.create({
      name,
      slug,
      icon,
      color,
      display_order: display_order || 0,
      is_visible: is_visible !== false && is_visible !== 'false',
      is_active: is_active !== false && is_active !== 'false',
    });

    res.status(201).json({ message: 'Category created successfully', data: category });
  } catch (error) {
    console.error('CourseCategoryController error:', error.message);
    res.status(500).json({ message: 'Failed to create category' });
  }
};

export const show = async (req, res) => {
  try {
    const category = await models.CourseCategory.findByPk(req.params.id, {
      include: [{ model: models.Course }],
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ data: category });
  } catch (error) {
    console.error('CourseCategoryController error:', error.message);
    res.status(500).json({ message: 'Failed to fetch category' });
  }
};

export const update = async (req, res) => {
  try {
    const category = await models.CourseCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const { name, icon, color, display_order, is_visible, is_active } = req.body;

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name;
      let slug = makeSlug(name);
      const existing = await models.CourseCategory.findOne({ where: { slug, id: { [Op.ne]: category.id } } });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }
      updateData.slug = slug;
    }
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_visible !== undefined) updateData.is_visible = is_visible === true || is_visible === 'true';
    if (is_active !== undefined) updateData.is_active = is_active === true || is_active === 'true';

    await category.update(updateData);

    res.json({ message: 'Category updated successfully', data: category });
  } catch (error) {
    console.error('CourseCategoryController error:', error.message);
    res.status(500).json({ message: 'Failed to update category' });
  }
};

export const destroy = async (req, res) => {
  try {
    const category = await models.CourseCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const coursesCount = await models.Course.count({ where: { category_id: category.id } });
    if (coursesCount > 0) {
      return res.status(400).json({ message: 'Cannot delete category with associated courses' });
    }

    await category.destroy();

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('CourseCategoryController error:', error.message);
    res.status(500).json({ message: 'Failed to delete category' });
  }
};

export const reorder = async (req, res) => {
  try {
    const { orders, categories } = req.body;
    const list = Array.isArray(orders) ? orders : categories;

    if (!Array.isArray(list)) {
      return res.status(400).json({ message: 'orders array is required' });
    }

    for (const item of list) {
      if (item.id && item.display_order !== undefined) {
        await models.CourseCategory.update(
          { display_order: item.display_order },
          { where: { id: item.id } }
        );
      }
    }

    const updatedCategories = await models.CourseCategory.findAll({
      order: [['display_order', 'ASC'], ['name', 'ASC']],
    });

    res.json({ message: 'Order updated successfully', data: updatedCategories });
  } catch (error) {
    console.error('CourseCategoryController error:', error.message);
    res.status(500).json({ message: 'Failed to reorder categories' });
  }
};

export const toggleActive = async (req, res) => {
  try {
    const category = await models.CourseCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.update({ is_active: !category.is_active });

    res.json({ message: `Category ${category.is_active ? 'activated' : 'deactivated'}`, data: category });
  } catch (error) {
    console.error('CourseCategoryController error:', error.message);
    res.status(500).json({ message: 'Failed to toggle active status' });
  }
};

export const toggleVisible = async (req, res) => {
  try {
    const category = await models.CourseCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.update({ is_visible: !category.is_visible });

    res.json({ message: `Category ${category.is_visible ? 'visible' : 'hidden'}`, data: category });
  } catch (error) {
    console.error('CourseCategoryController error:', error.message);
    res.status(500).json({ message: 'Failed to toggle visibility' });
  }
};
