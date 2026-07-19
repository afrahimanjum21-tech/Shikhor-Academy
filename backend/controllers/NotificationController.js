import models from '../models/index.js';
import { Op } from 'sequelize';

export const index = async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;

    const where = { user_id: req.user.id };
    if (type) where.type = type;

    const notifications = await models.Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    const total = await models.Notification.count({ where });

    res.json({ data: notifications, total });
  } catch (error) {
    console.error('NotificationController.index error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

export const unreadCount = async (req, res) => {
  try {
    const count = await models.Notification.count({
      where: {
        user_id: req.user.id,
        read_at: null,
      },
    });

    res.json({ data: { unread_count: count } });
  } catch (error) {
    console.error('NotificationController.unreadCount error:', error);
    res.status(500).json({ message: 'Failed to fetch unread count', error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await models.Notification.findOne({
      where: { id, user_id: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.read_at = new Date();
    await notification.save();

    res.json({ message: 'Notification marked as read', data: notification });
  } catch (error) {
    console.error('NotificationController.markAsRead error:', error);
    res.status(500).json({ message: 'Failed to mark as read', error: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await models.Notification.update(
      { read_at: new Date() },
      { where: { user_id: req.user.id, read_at: null } },
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('NotificationController.markAllAsRead error:', error);
    res.status(500).json({ message: 'Failed to mark all as read', error: error.message });
  }
};

export const markReadByType = async (req, res) => {
  try {
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({ message: 'type is required' });
    }

    await models.Notification.update(
      { read_at: new Date() },
      { where: { user_id: req.user.id, type, read_at: null } },
    );

    res.json({ message: `Notifications of type '${type}' marked as read` });
  } catch (error) {
    console.error('NotificationController.markReadByType error:', error);
    res.status(500).json({ message: 'Failed to mark notifications as read', error: error.message });
  }
};

export const recentActivity = async (req, res) => {
  try {
    const activities = await models.Notification.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    res.json({ data: activities });
  } catch (error) {
    console.error('NotificationController.recentActivity error:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity', error: error.message });
  }
};
