import models from '../../models/index.js';

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

    const material = await models.StudyMaterial.create({
      title,
      description: description || null,
      batch_id: batch_id || null,
      subject: subject || null,
      file_path: req.file ? req.file.path.replace(/\\/g, '/') : null,
      file_type: req.file ? req.file.mimetype : null,
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

    await material.destroy();

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('ResourceController.destroy error:', error);
    res.status(500).json({ message: 'Failed to delete material', error: error.message });
  }
};
