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
  material: '📄',
  album: '🖼️',
  event: '🎉',
  routine: '🗓️',
  video: '🎬',
};

const buildPayload = ({ type, icon, title, body, actionUrl, actionLabel, level = 'info' }) => ({
  type,
  icon: icon || DEFAULT_ICONS[type] || '🔔',
  title,
  body,
  action_url: actionUrl,
  action_label: actionLabel,
  level,
});

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
      ...buildPayload({ type, icon, title, body, actionUrl, actionLabel, level }),
    }));

    await models.Notification.bulkCreate(notifications);
  }

  static async createForBatch({ batchId, type, icon, title, body, actionUrl, actionLabel, level = 'info' }) {
    const students = await models.Student.findAll({
      where: { current_batch_id: batchId },
      attributes: ['user_id'],
    });

    return this.createForStudents({ userIds: students.map(s => s.user_id), type, icon, title, body, actionUrl, actionLabel, level });
  }

  static async createForAllStudents({ type, icon, title, body, actionUrl, actionLabel, level = 'info' }) {
    const students = await models.Student.findAll({
      attributes: ['user_id'],
    });

    return this.createForStudents({ userIds: students.map(s => s.user_id), type, icon, title, body, actionUrl, actionLabel, level });
  }

  static async createForStudents({ userIds, type, icon, title, body, actionUrl, actionLabel, level = 'info' }) {
    const ids = [...new Set((userIds || []).filter(Boolean))];
    if (ids.length === 0) return;

    const notifications = ids.map(userId => ({
      user_id: userId,
      ...buildPayload({ type, icon, title, body, actionUrl, actionLabel, level }),
    }));

    await models.Notification.bulkCreate(notifications);
  }

  static async create({ userId, type, icon, title, body, actionUrl, actionLabel, level = 'info' }) {
    return models.Notification.create({
      user_id: userId,
      ...buildPayload({ type, icon, title, body, actionUrl, actionLabel, level }),
    });
  }

  static defaultIcon(type) {
    return DEFAULT_ICONS[type] || '🔔';
  }
}

export default NotificationService;
