import models from '../models/index.js';
import { Op } from 'sequelize';
import SmsService from './sms/SmsService.js';
import EmailService from './email/EmailService.js';

// Notification types that also trigger an SMS to the recipient(s).
// Configurable via SMS_ENABLED_TYPES so the admin can turn any type on/off
// without a code change.
const SMS_TYPES = new Set(
  (process.env.SMS_ENABLED_TYPES || 'exam,payment,notice,material,assignment')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
);

// Same concept for email (see EmailService). SMS and email are independent —
// either can be on/off without affecting the other or the in-app notification.
const EMAIL_TYPES = new Set(
  (process.env.EMAIL_ENABLED_TYPES || 'exam,payment,notice,material,assignment')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
);

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

// Fire the SMS follow-up when the notification type is opted in. Never throws
// — SMS is best-effort and must not break the primary (in-app) notification.
const dispatchSms = async ({ type, userIds, userId, title, body }) => {
  if (!SMS_TYPES.has(String(type || '').toLowerCase())) return;
  try {
    if (userIds && userIds.length) {
      await SmsService.sendToUsers(userIds, SmsService.composeMessage(title, body));
    } else if (userId) {
      await SmsService.sendToUser(userId, SmsService.composeMessage(title, body));
    }
  } catch (err) {
    console.error('[NotificationService] SMS dispatch failed:', err.message);
  }
};

// Same for email — independent of SMS; both optional.
const dispatchEmail = async ({ type, userIds, userId, title, body, actionUrl, actionLabel }) => {
  if (!EMAIL_TYPES.has(String(type || '').toLowerCase())) return;
  try {
    const payload = { title, body, actionUrl, actionLabel };
    if (userIds && userIds.length) {
      await EmailService.sendToUsers(userIds, payload);
    } else if (userId) {
      await EmailService.sendToUser(userId, payload);
    }
  } catch (err) {
    console.error('[NotificationService] email dispatch failed:', err.message);
  }
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
    await dispatchSms({ type, userIds: ids, title, body });
    await dispatchEmail({ type, userIds: ids, title, body, actionUrl, actionLabel });
  }

  static async create({ userId, type, icon, title, body, actionUrl, actionLabel, level = 'info' }) {
    const notification = await models.Notification.create({
      user_id: userId,
      ...buildPayload({ type, icon, title, body, actionUrl, actionLabel, level }),
    });
    await dispatchSms({ type, userId, title, body });
    await dispatchEmail({ type, userId, title, body, actionUrl, actionLabel });
    return notification;
  }

  static defaultIcon(type) {
    return DEFAULT_ICONS[type] || '🔔';
  }
}

export default NotificationService;
