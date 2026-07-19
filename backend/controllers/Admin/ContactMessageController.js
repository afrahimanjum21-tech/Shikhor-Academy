import models from '../../models/index.js';
import { Op } from 'sequelize';

export const index = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await models.ContactMessage.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      offset,
      limit,
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
};

export const trashed = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;

    const { rows, count } = await models.ContactMessage.findAndCountAll({
      where: { deleted_at: { [Op.ne]: null } },
      paranoid: false,
      order: [['deleted_at', 'DESC']],
      offset,
      limit,
    });

    res.json({
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch trashed messages', error: error.message });
  }
};

export const show = async (req, res) => {
  try {
    const message = await models.ContactMessage.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json({ data: message });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch message', error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const message = await models.ContactMessage.findByPk(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await message.update({ is_read: true });

    res.json({ message: 'Message marked as read', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark message as read', error: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const count = await models.ContactMessage.update(
      { is_read: true },
      { where: { is_read: false } }
    );

    res.json({ message: `Marked ${count[0] || 0} messages as read` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark messages as read', error: error.message });
  }
};

export const destroy = async (req, res) => {
  try {
    const message = await models.ContactMessage.findByPk(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await message.destroy();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete message', error: error.message });
  }
};

export const restore = async (req, res) => {
  try {
    const message = await models.ContactMessage.findByPk(req.params.id, { paranoid: false });
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (!message.deleted_at) {
      return res.status(400).json({ message: 'Message is not deleted' });
    }

    await message.restore();

    res.json({ message: 'Message restored successfully', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restore message', error: error.message });
  }
};

export const forceDelete = async (req, res) => {
  try {
    const message = await models.ContactMessage.findByPk(req.params.id, { paranoid: false });
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await message.destroy({ force: true });

    res.json({ message: 'Message permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to permanently delete message', error: error.message });
  }
};
