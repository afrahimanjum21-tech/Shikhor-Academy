import models from '../models/index.js';
import { Op } from 'sequelize';

const DEFAULT_ICONS = {
  admission: '📋',
  contact: '✉️',
  leave: '📅',
  payment: '💰',
  assignment: '📝',
  exam: '📊',
  attendance: '✅',
  system: '🔔',
  message: '💬',
  faculty: '👨‍🏫',
};

class NotificationService {
  static async createForAdmins({ type, icon, title, body, actionUrl, actionLabel, level = 'info' }) {
    const admins = await models.User.findAll({
      where: {
        role: { [Op.in]: ['admin', 'super_admin'] },
        is_active: true,
      },
    });

    const notifications = admins.map(admin => ({
      user_id: admin.id,
      type,
      icon: icon || DEFAULT_ICONS[type] || '🔔',
      title,
      body,
      action_url: actionUrl,
      action_label: actionLabel,
      level,
    }));

    await models.Notification.bulkCreate(notifications);
  }

  static async create({ userId, type, icon, title, body, actionUrl, actionLabel, level = 'info' }) {
    return models.Notification.create({
      user_id: userId,
      type,
      icon: icon || DEFAULT_ICONS[type] || '🔔',
      title,
      body,
      action_url: actionUrl,
      action_label: actionLabel,
      level,
    });
  }

  static defaultIcon(type) {
    return DEFAULT_ICONS[type] || '🔔';
  }
}

export default NotificationService;
