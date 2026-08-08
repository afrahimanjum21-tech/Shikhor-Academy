import models from '../../models/index.js';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';
import NotificationService from '../../services/NotificationService.js';

const normalizeAlbum = (album) => {
  const data = album.toJSON ? album.toJSON() : { ...album };
  data.images = data.images || data.GalleryImages || [];
  delete data.GalleryImages;
  return data;
};

const getUploadedImages = (req) => {
  if (Array.isArray(req.files)) return req.files;
  return [
    ...(req.files?.images || []),
    ...(req.files?.image || []),
  ];
};

export const index = async (req, res) => {
  try {
    const albums = await models.Album.findAll({
      include: [{ model: models.GalleryImage }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ data: albums.map(normalizeAlbum) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch albums' });
  }
};

export const storeAlbum = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Album name is required' });
    }

    let thumbnail = null;
    if (req.file) {
      const result = await MediaService.upload(req.file, { folder: 'gallery' });
      thumbnail = result.url;
    }

    const album = await models.Album.create({ name, thumbnail });

    try {
      await NotificationService.createForAllStudents({
        type: 'album',
        title: 'New Gallery Album',
        body: `A new album "${name}" has been added.`,
        actionUrl: '/student/gallery',
        actionLabel: 'View Gallery',
      });
    } catch (notifErr) {
      console.error('Failed to send album notification:', notifErr);
    }

    res.status(201).json({ message: 'Album created successfully', data: album });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create album' });
  }
};

export const uploadImages = async (req, res) => {
  try {
    const { album: id } = req.params;

    const album = await models.Album.findByPk(id);
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    const files = getUploadedImages(req);

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    const imagePromises = files.map(async (file) => {
      const result = await MediaService.upload(file, { folder: 'gallery' });
      return { album_id: parseInt(id, 10), image_path: result.url, caption: req.body.caption || null };
    });
    const images = await Promise.all(imagePromises);

    const created = await models.GalleryImage.bulkCreate(images);

    res.status(201).json({ message: `${created.length} image(s) uploaded`, data: created });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload images' });
  }
};

export const destroyAlbum = async (req, res) => {
  try {
    const album = await models.Album.findByPk(req.params.id);
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    const galleryImages = await models.GalleryImage.findAll({ where: { album_id: album.id } });
    for (const img of galleryImages) {
      if (img.image_path) {
        await MediaDeleteService.deleteByUrl(img.image_path).catch(err => console.warn('Media cleanup:', err.message));
      }
    }
    await models.GalleryImage.destroy({ where: { album_id: album.id } });
    if (album.thumbnail) {
      await MediaDeleteService.deleteByUrl(album.thumbnail).catch(err => console.warn('Media cleanup:', err.message));
    }
    await album.destroy();

    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete album' });
  }
};

export const destroyImage = async (req, res) => {
  try {
    const image = await models.GalleryImage.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    if (image.image_path) {
      await MediaDeleteService.deleteByUrl(image.image_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    await image.destroy();

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete image' });
  }
};
