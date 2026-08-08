import models from '../../models/index.js';
import { Op } from 'sequelize';
import NotificationService from '../../services/NotificationService.js';

export const index = async (req, res) => {
  try {
    const { year, month, type } = req.query;

    const whereClause = {};
    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      whereClause.date = { [Op.between]: [startDate, endDate] };
    } else if (year) {
      whereClause.date = {
        [Op.between]: [`${year}-01-01`, `${year}-12-31`],
      };
    }
    if (type) whereClause.type = type;

    const events = await models.AcademicEvent.findAll({
      where: whereClause,
      order: [['date', 'ASC']],
    });

    return res.json({ data: events });
  } catch (error) {
    console.error('EventController.index error:', error);
    return res.status(500).json({ message: 'Failed to fetch events' });
  }
};

export const store = async (req, res) => {
  try {
    const { title, date, type, description } = req.body;

    if (!title || !date) {
      return res.status(400).json({ message: 'title and date are required' });
    }

    const event = await models.AcademicEvent.create({ title, date, type: type || null, description: description || null });

    try {
      await NotificationService.createForAllStudents({
        type: 'event',
        title: 'New Event',
        body: `"${title}" is scheduled for ${date}.`,
        actionUrl: '/student/calendar',
        actionLabel: 'View Calendar',
      });
    } catch (notifErr) {
      console.error('Failed to send event notification:', notifErr);
    }

    return res.status(201).json({ message: 'Event created', data: event });
  } catch (error) {
    console.error('EventController.store error:', error);
    return res.status(500).json({ message: 'Failed to create event' });
  }
};

export const destroy = async (req, res) => {
  try {
    const event = await models.AcademicEvent.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await event.destroy();
    return res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('EventController.destroy error:', error);
    return res.status(500).json({ message: 'Failed to delete event' });
  }
};
