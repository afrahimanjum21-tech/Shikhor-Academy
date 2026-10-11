import models from '../../models/index.js';
import NotificationService from '../../services/NotificationService.js';

export const index = async (req, res) => {
  try {
    const notices = await models.Notice.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.json({ data: notices });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notices' });
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

    try {
      await NotificationService.createForAllStudents({
        type: 'notice',
        title: 'New Notice',
        body: `${title}${description ? ` — ${description.slice(0, 120)}` : ''}`,
        actionUrl: '/notices',
        actionLabel: 'View Notice',
      });
    } catch (notifErr) {
      console.error('Failed to notify students about notice:', notifErr);
    }

    res.status(201).json({ message: 'Notice created successfully', data: notice });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create notice' });
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
    res.status(500).json({ message: 'Failed to fetch notice' });
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
    res.status(500).json({ message: 'Failed to update notice' });
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
    res.status(500).json({ message: 'Failed to delete notice' });
  }
};
