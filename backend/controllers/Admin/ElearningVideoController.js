import models from '../../models/index.js';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';

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
      order: [['sort_order', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json({ data: videos });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch videos', error: error.message });
  }
};

export const publicIndex = async (req, res) => {
  try {
    const videos = await models.ElearningVideo.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json({ data: videos });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch videos', error: error.message });
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
      is_locked: is_locked === true || is_locked === 'true',
      is_active: is_active !== false && is_active !== 'false',
      sort_order: sort_order || 0,
    });

    res.status(201).json({ message: 'Video created successfully', data: video });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create video', error: error.message });
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
    res.status(500).json({ message: 'Failed to fetch video', error: error.message });
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
    if (is_locked !== undefined) updateData.is_locked = is_locked === true || is_locked === 'true';
    if (is_active !== undefined) updateData.is_active = is_active === true || is_active === 'true';

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

    await video.update(updateData);

    res.json({ message: 'Video updated successfully', data: video });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update video', error: error.message });
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
    res.status(500).json({ message: 'Failed to delete video', error: error.message });
  }
};
