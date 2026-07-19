import models from '../../models/index.js';

export const index = async (req, res) => {
  try {
    const notices = await models.Notice.findAll({
      order: [['created_at', 'DESC']],
    });
    res.json({ data: notices });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notices', error: error.message });
  }
};

export const store = async (req, res) => {
  try {
    const { title, description, type, date } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const notice = await models.Notice.create({
      title,
      description,
      type: type || 'general',
      date: date || new Date().toISOString().split('T')[0],
    });

    res.status(201).json({ message: 'Notice created successfully', data: notice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create notice', error: error.message });
  }
};

export const show = async (req, res) => {
  try {
    const notice = await models.Notice.findByPk(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }
    res.json({ data: notice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notice', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const notice = await models.Notice.findByPk(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    const { title, description, type, date } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (date !== undefined) updateData.date = date;

    await notice.update(updateData);

    res.json({ message: 'Notice updated successfully', data: notice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notice', error: error.message });
  }
};

export const destroy = async (req, res) => {
  try {
    const notice = await models.Notice.findByPk(req.params.id);
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    await notice.destroy();

    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notice', error: error.message });
  }
};
