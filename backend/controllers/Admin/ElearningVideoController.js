import models from '../../models/index.js';
import { Op } from 'sequelize';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';
import NotificationService from '../../services/NotificationService.js';
import { resolveStudentAccess, isUnlocked, normalizeAccessType } from '../../services/accessControl.js';

const normalizeId = (value) => {
  if (value === undefined || value === null || value === '' || value === 'null') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Turns an access selection into clean column values. Switching the access
// type clears the other columns so stale restrictions can't leak through.
const buildAccess = async (body) => {
  const accessType = normalizeAccessType(body.access_type);

  if (accessType === 'batch') {
    const batchId = normalizeId(body.batch_id);
    if (batchId === null) return { access_type: 'all', batch_id: null, course_id: null, class_name: null };
    const batch = await models.Batch.findByPk(batchId);
    if (!batch) return { error: 'Selected batch does not exist' };
    return { access_type: accessType, batch_id: batchId, course_id: null, class_name: null };
  }

  if (accessType === 'course') {
    const courseId = normalizeId(body.course_id);
    if (courseId === null) return { access_type: 'all', batch_id: null, course_id: null, class_name: null };
    const course = await models.Course.findByPk(courseId);
    if (!course) return { error: 'Selected course does not exist' };
    return { access_type: accessType, batch_id: null, course_id: courseId, class_name: null };
  }

  if (accessType === 'class') {
    return {
      access_type: accessType,
      batch_id: null,
      course_id: null,
      class_name: String(body.class_name || '').trim() || null,
    };
  }

  return { access_type: 'all', batch_id: null, course_id: null, class_name: null };
};

const parseVideoUrl = (url) => {
  const result = { video_id: null, platform: null };

  if (!url) return result;

  const youtubeRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const ytMatch = url.match(youtubeRegex);
  if (ytMatch) {
    result.video_id = ytMatch[1];
    result.platform = 'youtube';
    return result;
  }

  const facebookRegex = /(?:facebook\.com|fb\.com)\/.+?(?:videos|reel|watch)(?:\/|\?v=)(\d+)/;
  const fbMatch = url.match(facebookRegex);
  if (fbMatch) {
    result.video_id = fbMatch[1];
    result.platform = 'facebook';
    return result;
  }

  const fbVideoIdRegex = /(?:facebook\.com|fb\.com)\/.+?\/(\d+)/;
  const fbIdMatch = url.match(fbVideoIdRegex);
  if (fbIdMatch) {
    result.video_id = fbIdMatch[1];
    result.platform = 'facebook';
    return result;
  }

  return result;
};

export const index = async (req, res) => {
  try {
    const videos = await models.ElearningVideo.findAll({
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.Course, attributes: ['id', 'title'] },
      ],
      order: [['sort_order', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json({ data: videos });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch videos' });
  }
};

export const publicIndex = async (req, res) => {
  try {
    const student = await resolveStudentAccess(req);

    // Every active video is listed; is_unlocked tells the UI whether the
    // current student may actually watch it based on batch/class/course rules.
    const videos = await models.ElearningVideo.findAll({
      where: { is_active: true },
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.Course, attributes: ['id', 'title'] },
      ],
      order: [['sort_order', 'ASC'], ['createdAt', 'DESC']],
    });

    videos.forEach(v => {
      // C23: one visibility rule combining BOTH flags — a video is watchable
      // only if it is not hard-locked (is_locked) AND the student is in scope
      // (access_type). This makes the is_locked toggle actually do something and
      // guarantees a locked video is never public even when access_type='all'.
      const unlocked = !v.is_locked && isUnlocked(v, student);
      v.dataValues.is_unlocked = unlocked;
      // A locked video must not leak ANY means to reconstruct a watch URL.
      // Nulling only video_url was insufficient: platform + video_id together
      // rebuild the embed/watch link (e.g. youtube.com/watch?v=<video_id>).
      if (!unlocked) {
        v.dataValues.video_url = null;
        v.dataValues.video_id = null;
        v.dataValues.platform = null;
      }
    });
    res.json({ data: videos });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch videos' });
  }
};

export const store = async (req, res) => {
  try {
    const { title, description, teacher, duration, video_url, is_locked, is_active, sort_order } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!video_url) {
      return res.status(400).json({ message: 'Video URL is required' });
    }

    const access = await buildAccess(req.body);
    if (access.error) {
      return res.status(400).json({ message: access.error });
    }

    const { video_id, platform } = parseVideoUrl(video_url);

    const thumbnail_path = req.file ? (await MediaService.upload(req.file, { folder: 'elearning' })).url : null;

    const video = await models.ElearningVideo.create({
      title,
      description,
      teacher,
      duration,
      video_url,
      platform: platform || 'other',
      video_id,
      thumbnail_path,
      is_locked: is_locked === true || is_locked === 'true' || is_locked === '1' || is_locked === 1,
      is_active: is_active === undefined || is_active === true || is_active === 'true' || is_active === '1' || is_active === 1,
      sort_order: sort_order || 0,
      ...access,
    });

    if (video.is_active) {
      try {
        if (video.access_type === 'batch' && video.batch_id) {
          await NotificationService.createForBatch({
            batchId: video.batch_id,
            type: 'video',
            title: 'New Video Lesson',
            body: `"${video.title}" is now available in E-Learning.`,
            actionUrl: '/student/e-learning',
            actionLabel: 'Watch Video',
          });
        } else if (video.access_type === 'all') {
          await NotificationService.createForAllStudents({
            type: 'video',
            title: 'New Video Lesson',
            body: `"${video.title}" is now available in E-Learning.`,
            actionUrl: '/student/e-learning',
            actionLabel: 'Watch Video',
          });
        } else if (video.access_type === 'course' && video.course_id) {
          const batchIds = await models.Batch.findAll({
            where: { course_id: video.course_id },
            attributes: ['id'],
          }).then(rows => rows.map(r => r.id));
          if (batchIds.length > 0) {
            const students = await models.Student.findAll({
              where: { current_batch_id: { [Op.in]: batchIds } },
              attributes: ['user_id'],
            });
            await NotificationService.createForStudents({
              userIds: students.map(s => s.user_id),
              type: 'video',
              title: 'New Video Lesson',
              body: `"${video.title}" is now available in E-Learning.`,
              actionUrl: '/student/e-learning',
              actionLabel: 'Watch Video',
            });
          }
        }
      } catch (notifErr) {
        console.error('Failed to send video notification:', notifErr);
      }
    }

    res.status(201).json({ message: 'Video created successfully', data: video });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create video' });
  }
};

export const show = async (req, res) => {
  try {
    const video = await models.ElearningVideo.findByPk(req.params.id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.json({ data: video });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch video' });
  }
};

export const update = async (req, res) => {
  try {
    const video = await models.ElearningVideo.findByPk(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const { title, description, teacher, duration, video_url, is_locked, is_active, sort_order } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (teacher !== undefined) updateData.teacher = teacher;
    if (duration !== undefined) updateData.duration = duration;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_locked !== undefined) updateData.is_locked = is_locked === true || is_locked === '1' || is_locked === 'true';
    if (is_active !== undefined) updateData.is_active = is_active === true || is_active === '1' || is_active === 'true';

    if (req.body.access_type !== undefined || req.body.batch_id !== undefined ||
        req.body.course_id !== undefined || req.body.class_name !== undefined) {
      const access = await buildAccess(req.body);
      if (access.error) {
        return res.status(400).json({ message: access.error });
      }
      Object.assign(updateData, access);
    }

    if (video_url !== undefined) {
      updateData.video_url = video_url;
      const { video_id, platform } = parseVideoUrl(video_url);
      updateData.video_id = video_id;
      updateData.platform = platform || 'other';
    }

    if (req.file) {
      const result = await MediaService.upload(req.file, { folder: 'elearning' });
      if (video.thumbnail_path) {
        await MediaDeleteService.deleteByUrl(video.thumbnail_path).catch(err => console.warn('Media cleanup:', err.message));
      }
      updateData.thumbnail_path = result.url;
    }

    if (req.body.remove_thumbnail === '1') {
      if (video.thumbnail_path) {
        await MediaDeleteService.deleteByUrl(video.thumbnail_path).catch(err => console.warn('Media cleanup:', err.message));
      }
      updateData.thumbnail_path = null;
    }

    await video.update(updateData);

    res.json({ message: 'Video updated successfully', data: video });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update video' });
  }
};

export const destroy = async (req, res) => {
  try {
    const video = await models.ElearningVideo.findByPk(req.params.id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.thumbnail_path) {
      await MediaDeleteService.deleteByUrl(video.thumbnail_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    await video.destroy();

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete video' });
  }
};
