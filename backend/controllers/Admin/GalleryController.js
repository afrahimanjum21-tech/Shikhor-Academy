import models from '../../models/index.js';

export const index = async (req, res) => {
  try {
    const albums = await models.Album.findAll({
      include: [{ model: models.GalleryImage }],
      order: [['created_at', 'DESC']],
    });
    res.json({ data: albums });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch albums', error: error.message });
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
      thumbnail = req.file.path.replace(/\\/g, '/');
    }

    const album = await models.Album.create({ name, thumbnail });

    res.status(201).json({ message: 'Album created successfully', data: album });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create album', error: error.message });
  }
};

export const uploadImages = async (req, res) => {
  try {
    const { id } = req.params;

    const album = await models.Album.findByPk(id);
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    const images = req.files.map(file => ({
      album_id: parseInt(id, 10),
      image_path: file.path.replace(/\\/g, '/'),
      caption: req.body.caption || null,
    }));

    const created = await models.GalleryImage.bulkCreate(images);

    res.status(201).json({ message: `${created.length} image(s) uploaded`, data: created });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload images', error: error.message });
  }
};

export const destroyAlbum = async (req, res) => {
  try {
    const album = await models.Album.findByPk(req.params.id);
    if (!album) {
      return res.status(404).json({ message: 'Album not found' });
    }

    await models.GalleryImage.destroy({ where: { album_id: album.id } });
    await album.destroy();

    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete album', error: error.message });
  }
};

export const destroyImage = async (req, res) => {
  try {
    const image = await models.GalleryImage.findByPk(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    await image.destroy();

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete image', error: error.message });
  }
};
