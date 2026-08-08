import models from '../../models/index.js';
import { Op } from 'sequelize';
import NotificationService from '../../services/NotificationService.js';

export const index = async (req, res) => {
  try {
    const { batch_id, status } = req.query;

    const whereClause = {};
    if (batch_id) whereClause.batch_id = batch_id;
    if (status) whereClause.status = status;

    const routines = await models.Routine.findAll({
      where: whereClause,
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Updater', attributes: ['id', 'name'] },
      ],
      order: [
        ['batch_id', 'ASC'],
        ['day', 'ASC'],
        ['start_time', 'ASC'],
      ],
    });

    return res.json({ data: routines });
  } catch (error) {
    console.error('RoutineController.index error:', error);
    return res.status(500).json({ message: 'Failed to fetch routines' });
  }
};

export const meta = async (req, res) => {
  try {
    const batches = await models.Batch.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    return res.json({ batches, days });
  } catch (error) {
    console.error('RoutineController.meta error:', error);
    return res.status(500).json({ message: 'Failed to fetch meta data' });
  }
};

export const store = async (req, res) => {
  try {
    const routine = await models.Routine.create(req.body);
    return res.status(201).json({ message: 'Routine entry created', data: routine });
  } catch (error) {
    console.error('RoutineController.store error:', error);
    return res.status(500).json({ message: 'Failed to create routine entry' });
  }
};

export const saveAll = async (req, res) => {
  try {
    const { batch_id, routines } = req.body;

    if (!batch_id || !routines || !Array.isArray(routines)) {
      return res.status(400).json({ message: 'batch_id and routines array are required' });
    }

    const created = [];

    for (const entry of routines) {
      const [routine] = await models.Routine.upsert({
        batch_id,
        day: entry.day,
        subject: entry.subject,
        teacher_name: entry.teacher_name,
        start_time: entry.start_time,
        end_time: entry.end_time,
        time_slot: entry.time_slot,
        teacher: entry.teacher,
        room: entry.room,
        lab: entry.lab,
        notes: entry.notes,
        status: entry.status || 'draft',
        academic_year: entry.academic_year,
        session: entry.session,
        department: entry.department,
        program: entry.program,
        semester: entry.semester,
        section: entry.section,
        shift: entry.shift,
        updated_by: req.user.id,
      });
      created.push(routine);
    }

    return res.status(201).json({ message: 'Routines saved successfully', count: created.length });
  } catch (error) {
    console.error('RoutineController.saveAll error:', error);
    return res.status(500).json({ message: 'Failed to save routines' });
  }
};

export const publish = async (req, res) => {
  try {
    const { batch_id } = req.body;

    if (!batch_id) {
      return res.status(400).json({ message: 'batch_id is required' });
    }

    const draftRoutines = await models.Routine.findAll({
      where: { batch_id, status: 'draft' },
    });

    if (draftRoutines.length === 0) {
      return res.status(400).json({ message: 'No draft routines found for this batch' });
    }

    await models.Routine.update(
      { status: 'archived' },
      { where: { batch_id, status: 'published' } }
    );

    for (const data of draftRoutines.map(r => r.toJSON())) {
      delete data.id;
      data.status = 'published';
      await models.Routine.create(data);
    }

    await models.Routine.destroy({ where: { batch_id, status: 'draft' } });

    try {
      await NotificationService.createForBatch({
        batchId: batch_id,
        type: 'routine',
        title: 'Class Routine Updated',
        body: 'A new class routine has been published for your batch.',
        actionUrl: '/student/routine',
        actionLabel: 'View Routine',
      });
    } catch (notifErr) {
      console.error('Failed to send routine notification:', notifErr);
    }

    return res.json({ message: 'Routines published successfully' });
  } catch (error) {
    console.error('RoutineController.publish error:', error);
    return res.status(500).json({ message: 'Failed to publish routines' });
  }
};

export const unpublish = async (req, res) => {
  try {
    const { batch_id } = req.body;

    if (!batch_id) {
      return res.status(400).json({ message: 'batch_id is required' });
    }

    await models.Routine.update(
      { status: 'draft' },
      { where: { batch_id, status: 'published' } }
    );

    return res.json({ message: 'Routines unpublished (reverted to draft)' });
  } catch (error) {
    console.error('RoutineController.unpublish error:', error);
    return res.status(500).json({ message: 'Failed to unpublish routines' });
  }
};

export const renameTimeSlot = async (req, res) => {
  try {
    const { old_label, new_label, batch_id } = req.body;

    if (!old_label || !new_label) {
      return res.status(400).json({ message: 'old_label and new_label are required' });
    }

    const whereClause = { time_slot: old_label };
    if (batch_id) whereClause.batch_id = batch_id;

    const [updatedCount] = await models.Routine.update(
      { time_slot: new_label },
      { where: whereClause }
    );

    return res.json({ message: 'Time slot renamed', updatedCount });
  } catch (error) {
    console.error('RoutineController.renameTimeSlot error:', error);
    return res.status(500).json({ message: 'Failed to rename time slot' });
  }
};

export const update = async (req, res) => {
  try {
    const routine = await models.Routine.findByPk(req.params.id);
    if (!routine) {
      return res.status(404).json({ message: 'Routine entry not found' });
    }

    await routine.update({ ...req.body, updated_by: req.user.id });
    return res.json({ message: 'Routine updated', data: routine });
  } catch (error) {
    console.error('RoutineController.update error:', error);
    return res.status(500).json({ message: 'Failed to update routine' });
  }
};

export const destroy = async (req, res) => {
  try {
    const routine = await models.Routine.findByPk(req.params.id);
    if (!routine) {
      return res.status(404).json({ message: 'Routine entry not found' });
    }

    await routine.destroy();
    return res.json({ message: 'Routine entry deleted' });
  } catch (error) {
    console.error('RoutineController.destroy error:', error);
    return res.status(500).json({ message: 'Failed to delete routine' });
  }
};

export const myRoutine = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const routines = await models.Routine.findAll({
      where: {
        batch_id: student.current_batch_id,
        status: 'published',
      },
      include: [{ model: models.Batch, attributes: ['id', 'name'] }],
      order: [['day', 'ASC'], ['start_time', 'ASC']],
    });

    // Build the structure the student panel renders:
    // { shifts: { shiftName: { dayName: [cells] } }, label, meta }
    const shifts = {};
    let label = '';
    let meta = {};
    routines.forEach((routine) => {
      const json = routine.toJSON();
      const shift = json.shift || 'default';
      if (!shifts[shift]) shifts[shift] = {};
      if (!shifts[shift][json.day]) shifts[shift][json.day] = [];
      shifts[shift][json.day].push(json);
      if (json.Batch) label = json.Batch.name;
      if (json.department || json.program || json.semester || json.section ||
          json.academic_year || json.session) {
        meta = {
          department: json.department,
          program: json.program,
          semester: json.semester,
          section: json.section,
          academic_year: json.academic_year,
          session: json.session,
        };
      }
    });

    return res.json({ data: { shifts, label, meta } });
  } catch (error) {
    console.error('RoutineController.myRoutine error:', error);
    res.status(500).json({ message: 'Failed to fetch routine' });
  }
};
