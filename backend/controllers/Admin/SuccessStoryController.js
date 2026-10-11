import models from '../../models/index.js';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';
import { Op } from 'sequelize';

// Latin + Bengali letters, digits and hyphens; used for public story URLs.
const slugify = (name) =>
  String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'story';

// Returns a slug guaranteed not to collide with another story (id excluded).
async function uniqueSlug(base, excludeId) {
  const existing = await models.SuccessStory.findAll({
    where: { slug: { [Op.like]: `${base}%` } },
    attributes: ['id', 'slug'],
  });
  const taken = new Set(existing.filter(r => r.id !== excludeId).map(r => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export const index = async (req, res) => {
  try {
    const stories = await models.SuccessStory.findAll({
      order: [['display_order', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json({ data: stories });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch success stories' });
  }
};

// Public listing — active stories only, ordered for the home page. Supports
// pagination (limit/offset) so a dedicated public page can "Load More";
// omitting the params keeps the old behaviour (first 12) for the home page.
export const publicIndex = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { count, rows } = await models.SuccessStory.findAndCountAll({
      where: { is_active: true },
      order: [['display_order', 'ASC'], ['createdAt', 'DESC']],
      limit,
      offset,
    });
    res.json({ data: rows, total: count });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch success stories' });
  }
};

// Public single story — by slug (preferred) or numeric id (admin previews).
export const publicShow = async (req, res) => {
  try {
    const param = String(req.params.slug || '');
    const where = { is_active: true };
    if (/^\d+$/.test(param)) {
      where.id = parseInt(param, 10);
    } else {
      where.slug = param;
    }
    const storyRecord = await models.SuccessStory.findOne({ where });
    if (!storyRecord) {
      return res.status(404).json({ message: 'Success story not found' });
    }
    res.json({ data: storyRecord });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch success story' });
  }
};

export const store = async (req, res) => {
  try {
    const { student_name, achievement, batch_info, story, message, display_order, is_active } = req.body;

    // D16: trim ONCE and use the SAME normalized values for the duplicate check
    // AND persistence — otherwise a stored untrimmed story never matches the
    // trimmed lookup, so whitespace padding slips a duplicate past the guard.
    // Only edge whitespace is removed; internal formatting is preserved.
    const nameNorm = String(student_name == null ? '' : student_name).trim();
    const storyNorm = story == null ? story : String(story).trim();

    if (!nameNorm) {
      return res.status(400).json({ message: 'student_name is required' });
    }

    // Guard against double-submits: an identical story already exists, so
    // return it instead of creating another duplicate row.
    if (storyNorm) {
      const existing = await models.SuccessStory.findOne({
        where: { student_name: nameNorm, story: storyNorm },
      });
      if (existing) {
        return res.status(200).json({ message: 'This success story already exists', data: existing });
      }
    }

    let photo = null;
    if (req.file) {
      const result = await MediaService.upload(req.file, { folder: 'success_stories' });
      photo = result.url;
    }

    const slug = await uniqueSlug(slugify(nameNorm));

    const storyRecord = await models.SuccessStory.create({
      student_name: nameNorm,
      achievement,
      batch_info,
      story: storyNorm,
      message,
      photo,
      slug,
      display_order: display_order !== undefined ? parseInt(display_order, 10) || 0 : 0,
      is_active: is_active === true || is_active === '1' || is_active === 'true',
    });

    res.status(201).json({ message: 'Success story created', data: storyRecord });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create success story' });
  }
};

export const show = async (req, res) => {
  try {
    const storyRecord = await models.SuccessStory.findByPk(req.params.id);
    if (!storyRecord) {
      return res.status(404).json({ message: 'Success story not found' });
    }
    res.json({ data: storyRecord });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch success story' });
  }
};

export const update = async (req, res) => {
  try {
    const storyRecord = await models.SuccessStory.findByPk(req.params.id);
    if (!storyRecord) {
      return res.status(404).json({ message: 'Success story not found' });
    }

    const { student_name, achievement, batch_info, story, message, display_order, is_active, remove_photo } = req.body;
    const updateData = {};
    if (student_name !== undefined) {
      updateData.student_name = student_name;
      updateData.slug = await uniqueSlug(slugify(student_name), storyRecord.id);
    }
    if (achievement !== undefined) updateData.achievement = achievement;
    if (batch_info !== undefined) updateData.batch_info = batch_info;
    if (story !== undefined) updateData.story = story;
    if (message !== undefined) updateData.message = message;
    if (display_order !== undefined) updateData.display_order = parseInt(display_order, 10) || 0;
    if (is_active !== undefined) updateData.is_active = is_active === true || is_active === '1' || is_active === 'true';

    if (req.file) {
      const result = await MediaService.upload(req.file, { folder: 'success_stories' });
      if (storyRecord.photo) {
        await MediaDeleteService.deleteByUrl(storyRecord.photo).catch(err => console.warn('Media cleanup:', err.message));
      }
      updateData.photo = result.url;
    } else if (remove_photo === '1' || remove_photo === 'true') {
      if (storyRecord.photo) {
        await MediaDeleteService.deleteByUrl(storyRecord.photo).catch(err => console.warn('Media cleanup:', err.message));
      }
      updateData.photo = null;
    }

    await storyRecord.update(updateData);

    res.json({ message: 'Success story updated', data: storyRecord });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update success story' });
  }
};

export const destroy = async (req, res) => {
  try {
    const storyRecord = await models.SuccessStory.findByPk(req.params.id);
    if (!storyRecord) {
      return res.status(404).json({ message: 'Success story not found' });
    }

    if (storyRecord.photo) {
      await MediaDeleteService.deleteByUrl(storyRecord.photo).catch(err => console.warn('Media cleanup:', err.message));
    }

    await storyRecord.destroy();
    res.json({ message: 'Success story deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete success story' });
  }
};