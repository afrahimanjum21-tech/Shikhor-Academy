import models from '../models/index.js';
import { Op, fn, col } from 'sequelize';
import { parseSince, makeAfter } from '../utils/sinceFilters.js';
import NotificationService from '../services/NotificationService.js';

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const serializeNotification = (notification) => {
  const data = notification.toJSON ? notification.toJSON() : { ...notification };
  return {
    ...data,
    is_read: data.read_at != null,
    time_ago: timeAgo(data.createdAt || data.created_at),
  };
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Builds synthetic dropdown items from unread business-table counts so the
// bell bubble (which includes them) always matches the visible list.
const buildSyntheticItems = async (user, after) => {
  const synth = [];
  const role = user.role;

  // Unread notification rows per type, so a business event that already has
  // its own row is not ALSO listed as a synthetic summary item.
  const unreadRows = await models.Notification.findAll({
    where: { user_id: user.id, read_at: null },
    attributes: ['type', [fn('COUNT', col('id')), 'n']],
    group: ['type'],
  });
  const rowCountByType = unreadRows.reduce((m, r) => {
    m[r.type] = Number(r.get('n'));
    return m;
  }, {});

  if (role === 'admin' || role === 'super_admin') {
    const [pendingAdmissions, holdAdmissions, pendingPayments, pendingLeaveRequests, unreadMessages, latestAdmission, latestPayment, latestLeave, latestMessage] = await Promise.all([
      models.AdmissionApplication.count({ where: { status: 'pending', ...after('createdAt', 'admissions') } }),
      models.AdmissionApplication.count({ where: { status: 'hold', ...after('createdAt', 'admissions') } }),
      models.Payment.count({ where: { status: 'pending', ...after('createdAt', 'payments') } }),
      models.Attendance.count({ where: { leave_status: 'pending', ...after('createdAt', 'leaves') } }),
      models.ContactMessage.count({ where: { is_read: false, ...after('createdAt', 'messages') } }),
      models.AdmissionApplication.max('createdAt', { where: { ...after('createdAt', 'admissions') } }),
      models.Payment.max('createdAt', { where: { status: 'pending', ...after('createdAt', 'payments') } }),
      models.Attendance.max('createdAt', { where: { leave_status: 'pending', ...after('createdAt', 'leaves') } }),
      models.ContactMessage.max('createdAt', { where: { is_read: false, ...after('createdAt', 'messages') } }),
    ]);

    const push = (id, type, title, body, actionUrl, level, createdAt) => {
      if (!createdAt) return;
      synth.push({
        id,
        synthetic: true,
        type,
        icon: NotificationService.defaultIcon(type),
        title,
        body,
        action_url: actionUrl,
        action_label: 'View',
        level,
        createdAt,
      });
    };

    const totalAdmissions = pendingAdmissions + holdAdmissions;
    const missingAdmissionRows = totalAdmissions > (rowCountByType.admission || 0);
    const missingPaymentRows = pendingPayments > (rowCountByType.payment || 0);
    const missingLeaveRows = pendingLeaveRequests > (rowCountByType.leave || 0);
    const missingMessageRows = unreadMessages > (rowCountByType.contact || 0);
    if (totalAdmissions > 0 && missingAdmissionRows) push('syn-admissions', 'admission', plural(totalAdmissions, 'pending admission application'), 'New applications awaiting review', '/admin/admissions', 'warning', latestAdmission);
    if (pendingPayments > 0 && missingPaymentRows) push('syn-payments', 'payment', plural(pendingPayments, 'pending payment'), 'Payments awaiting confirmation', '/admin/payments', 'warning', latestPayment);
    if (pendingLeaveRequests > 0 && missingLeaveRows) push('syn-leaves', 'leave', plural(pendingLeaveRequests, 'pending leave request'), 'Leave requests awaiting review', '/admin/leave-requests', 'warning', latestLeave);
    if (unreadMessages > 0 && missingMessageRows) push('syn-messages', 'contact', plural(unreadMessages, 'unread message'), 'New contact form messages', '/admin/contact-messages', 'info', latestMessage);
  }

  if (role === 'teacher') {
    const submissionWhere = {
      status: 'submitted',
      ...after('updatedAt', 'reviews'),
    };
    const submissionInclude = [{
      model: models.Assignment,
      where: { teacher_id: user.id },
      attributes: [],
    }];
    const [pendingSubmissions, latestSubmission] = await Promise.all([
      models.AssignmentSubmission.count({ where: submissionWhere, include: submissionInclude }),
      models.AssignmentSubmission.max('updatedAt', { where: submissionWhere, include: submissionInclude }),
    ]);
    if (latestSubmission && pendingSubmissions > (rowCountByType.assignment || 0)) {
      synth.push({
        id: 'syn-reviews',
        synthetic: true,
        type: 'assignment',
        icon: NotificationService.defaultIcon('assignment'),
        title: plural(pendingSubmissions, 'assignment submission'),
        body: 'Submissions awaiting your review',
        action_url: '/teacher/assignments',
        action_label: 'Review',
        level: 'warning',
        createdAt: latestSubmission,
      });
    }
  }

  return synth;
};

export const index = async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    const parsedLimit = parseInt(limit, 10) || 50;
    const parsedOffset = parseInt(offset, 10) || 0;

    const where = { user_id: req.user.id, read_at: null };
    if (type) where.type = type;

    const role = req.user.role;
    const needsSynthetic = role === 'admin' || role === 'super_admin' || role === 'teacher';

    let rows;
    let rowTotal;
    if (needsSynthetic) {
      [rows, rowTotal] = await Promise.all([
        models.Notification.findAll({ where, order: [['createdAt', 'DESC']], limit: 1000 }),
        models.Notification.count({ where }),
      ]);
    } else {
      [rows, rowTotal] = await Promise.all([
        models.Notification.findAll({
          where,
          order: [['createdAt', 'DESC']],
          limit: parsedLimit,
          offset: parsedOffset,
        }),
        models.Notification.count({ where }),
      ]);
    }

    let items = rows.map(serializeNotification);
    let total = rowTotal;

    if (needsSynthetic) {
      const since = parseSince(req.query);
      const after = makeAfter(since);
      const synthetic = await buildSyntheticItems(req.user, after);
      items = [...synthetic, ...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      total = items.length;
      items = items.slice(parsedOffset, parsedOffset + parsedLimit);
    }

    res.json({ data: items, total });
  } catch (error) {
    console.error('NotificationController.index error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
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
    res.status(500).json({ message: 'Failed to fetch unread count' });
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
    res.status(500).json({ message: 'Failed to mark as read' });
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
    res.status(500).json({ message: 'Failed to mark all as read' });
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
    res.status(500).json({ message: 'Failed to mark notifications as read' });
  }
};

export const recentActivity = async (req, res) => {
  try {
    const activities = await models.Notification.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    res.json({ data: activities.map(serializeNotification) });
  } catch (error) {
    console.error('NotificationController.recentActivity error:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity' });
  }
};
