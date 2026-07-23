import models from '../../models/index.js';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';

export const publicIndex = async (req, res) => {
  try {
    const { type, subject, batch_id } = req.query;

    const where = {};
    if (type) where.type = type;
    if (subject) where.subject = subject;
    if (batch_id) where.batch_id = batch_id;

    const materials = await models.StudyMaterial.findAll({
      where,
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Uploader', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ data: materials });
  } catch (error) {
    console.error('ResourceController.publicIndex error:', error);
    res.status(500).json({ message: 'Failed to fetch materials', error: error.message });
  }
};

export const uploadMaterial = async (req, res) => {
  try {
    const { title, description, batch_id, subject, type, url } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }

    let file_path = null;
    let file_type = null;
    if (req.file) {
      const uploadResult = await MediaService.upload(req.file, { bucket: 'materials', folder: 'general' });
      file_path = uploadResult.url;
      file_type = req.file.mimetype;
    }

    const material = await models.StudyMaterial.create({
      title,
      description: description || null,
      batch_id: batch_id || null,
      subject: subject || null,
      file_path,
      file_type,
      uploaded_by: req.user.id,
      type: type || null,
      url: url || null,
    });

    const result = await models.StudyMaterial.findByPk(material.id, {
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Uploader', attributes: ['id', 'name'] },
      ],
    });

    res.status(201).json({ message: 'Material uploaded successfully', data: result });
  } catch (error) {
    console.error('ResourceController.uploadMaterial error:', error);
    res.status(500).json({ message: 'Failed to upload material', error: error.message });
  }
};

export const destroy = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await models.StudyMaterial.findByPk(id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (material.file_path) {
      await MediaDeleteService.deleteByUrl(material.file_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    await material.destroy();

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('ResourceController.destroy error:', error);
    res.status(500).json({ message: 'Failed to delete material', error: error.message });
  }
};
