import models from '../../models/index.js';
import { Op } from 'sequelize';
import NotificationService from '../../services/NotificationService.js';
import { parseTimeSlot } from '../../services/routineTime.js';

// D6: the only fields a client may write to a Routine row (no raw req.body
// mass-assignment). `status`/`updated_by` are set by the server where relevant.
const ROUTINE_WRITABLE = [
  'batch_id', 'day', 'subject', 'teacher_name', 'teacher', 'room', 'lab', 'notes',
  'time_slot', 'start_time', 'end_time', 'status',
  'academic_year', 'session', 'department', 'program', 'semester', 'section', 'shift',
];

export const index = async (req, res) => {
  try {
    const { batch_id, shift, status } = req.query;

    const whereClause = {};
    if (batch_id) whereClause.batch_id = batch_id;
    if (shift) whereClause.shift = shift;
    if (status) whereClause.status = status;

    const routines = await models.Routine.findAll({
      where: whereClause,
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Updater', attributes: ['id', 'name'] },
      ],
      order: [
        ['day', 'ASC'],
        ['time_slot', 'ASC'],
      ],
    });

    // Frontend contract: { days: { dayName: [rows] }, status } — top-level,
    // because the api.js interceptor only unwraps arrays for /admin/routines.
    const days = {};
    routines.forEach((routine) => {
      const json = routine.toJSON();
      if (!days[json.day]) days[json.day] = [];
      days[json.day].push(json);
    });

    // C13: never pass `batch_id: undefined` to Sequelize — only scope the
    // status counts to a batch when one was actually supplied.
    const countBase = batch_id ? { batch_id } : {};
    const [draftCount, publishedCount] = await Promise.all([
      models.Routine.count({ where: { ...countBase, status: 'draft' } }),
      models.Routine.count({ where: { ...countBase, status: 'published' } }),
    ]);

    return res.json({
      days,
      status: { hasDraft: draftCount > 0, hasPublished: publishedCount > 0 },
    });
  } catch (error) {
    console.error('RoutineController.index error:', error);
    return res.status(500).json({ message: 'Failed to fetch routines' });
  }
};

export const meta = async (req, res) => {
  try {
    const { batch_id } = req.query;

    const batches = await models.Batch.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']],
    });

    const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Distinct academic-context values used by the admin filter datalists.
    const distinct = {};
    if (batch_id) {
      const rows = await models.Routine.findAll({
        where: { batch_id },
        attributes: ['academic_year', 'session', 'department', 'program', 'semester', 'section'],
        raw: true,
      });
      for (const key of ['academic_year', 'session', 'department', 'program', 'semester', 'section']) {
        distinct[key] = [...new Set(rows.map(r => r[key]).filter(Boolean))].sort();
      }
    }

    return res.json({ batches, days, ...distinct });
  } catch (error) {
    console.error('RoutineController.meta error:', error);
    return res.status(500).json({ message: 'Failed to fetch meta data' });
  }
};

export const store = async (req, res) => {
  try {
    // D6: explicit allowlist instead of `{ ...req.body }` mass assignment.
    const data = {};
    for (const key of ROUTINE_WRITABLE) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (data.batch_id) data.batch_id = Number(data.batch_id);
    // D5: keep start_time/end_time consistent with time_slot so the unique
    // index + myRoutine sort are meaningful (never silently null).
    if (data.time_slot && (!data.start_time || !data.end_time)) {
      const parsed = parseTimeSlot(data.time_slot);
      if (!data.start_time) data.start_time = parsed.start_time;
      if (!data.end_time) data.end_time = parsed.end_time;
    }
    if (req.user?.id) data.updated_by = req.user.id;
    const routine = await models.Routine.create(data);
    // Frontend expects the created routine object directly (uses `data.id`).
    return res.status(201).json(routine);
  } catch (error) {
    console.error('RoutineController.store error:', error);
    return res.status(500).json({ message: 'Failed to create routine entry' });
  }
};

export const saveAll = async (req, res) => {
  try {
    const { batch_id, cells, status, shift } = req.body;

    if (!batch_id) {
      return res.status(400).json({ message: 'batch_id is required' });
    }
    if (!Array.isArray(cells)) {
      return res.status(400).json({ message: 'cells array is required' });
    }

    const mode = status === 'published' ? 'published' : 'draft';

    // Replace semantics: the grid sends every cell of the shift, so wipe the
    // current set for this shift/mode and re-create the non-empty cells.
    // C13: only filter by `shift` when one was supplied (never `shift: undefined`).
    const destroyWhere = { batch_id, status: mode };
    if (shift !== undefined && shift !== null && shift !== '') destroyWhere.shift = shift;
    await models.Routine.destroy({ where: destroyWhere });

    const filterFields = {};
    for (const key of ['academic_year', 'session', 'department', 'program', 'semester', 'section']) {
      if (req.body[key]) filterFields[key] = req.body[key];
    }

    const created = [];
    for (const cell of cells) {
      const subject = (cell.subject || '').trim();
      const teacher = (cell.teacher || '').trim();
      const room = (cell.room || '').trim();
      const lab = (cell.lab || '').trim();
      const notes = (cell.notes || '').trim();
      if (!subject && !teacher && !room && !lab && !notes) continue;

      // D5: populate start_time/end_time (from the cell or parsed from the
      // time_slot label) so the unique index + myRoutine sort are meaningful.
      const parsed = parseTimeSlot(cell.time_slot);
      const routine = await models.Routine.create({
        batch_id,
        day: cell.day,
        time_slot: cell.time_slot,
        start_time: cell.start_time || parsed.start_time,
        end_time: cell.end_time || parsed.end_time,
        shift: cell.shift || shift,
        subject,
        teacher,
        room,
        lab,
        notes,
        status: mode,
        updated_by: req.user.id,
        ...filterFields,
      });
      created.push(routine.toJSON());
    }

    const days = {};
    created.forEach((row) => {
      if (!days[row.day]) days[row.day] = [];
      days[row.day].push(row);
    });

    const [draftCount, publishedCount] = await Promise.all([
      models.Routine.count({ where: { batch_id, status: 'draft' } }),
      models.Routine.count({ where: { batch_id, status: 'published' } }),
    ]);

    return res.status(201).json({
      days,
      status: { hasDraft: draftCount > 0, hasPublished: publishedCount > 0 },
    });
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

    // I-7: return the SAME status shape index/saveAll use so the UI reflects the
    // persisted state after the mutation instead of a missing property.
    const [draftCount, publishedCount] = await Promise.all([
      models.Routine.count({ where: { batch_id, status: 'draft' } }),
      models.Routine.count({ where: { batch_id, status: 'published' } }),
    ]);
    return res.json({
      message: 'Routines published successfully',
      status: { hasDraft: draftCount > 0, hasPublished: publishedCount > 0 },
    });
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

    // I-7: report the persisted status so the UI badge updates correctly.
    const [draftCount, publishedCount] = await Promise.all([
      models.Routine.count({ where: { batch_id, status: 'draft' } }),
      models.Routine.count({ where: { batch_id, status: 'published' } }),
    ]);
    return res.json({
      message: 'Routines unpublished (reverted to draft)',
      status: { hasDraft: draftCount > 0, hasPublished: publishedCount > 0 },
    });
  } catch (error) {
    console.error('RoutineController.unpublish error:', error);
    return res.status(500).json({ message: 'Failed to unpublish routines' });
  }
};

export const renameTimeSlot = async (req, res) => {
  try {
    // Frontend sends old_slot/new_slot; legacy clients used old_label/new_label.
    const { old_label, new_label, old_slot, new_slot, batch_id } = req.body;
    const oldName = old_slot || old_label;
    const newName = new_slot || new_label;

    if (!oldName || !newName) {
      return res.status(400).json({ message: 'old_slot and new_slot are required' });
    }

    const whereClause = { time_slot: oldName };
    if (batch_id) whereClause.batch_id = batch_id;

    const [updatedCount] = await models.Routine.update(
      { time_slot: newName },
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

    // D6: allowlist (not raw req.body). D5: re-derive times if time_slot changes.
    const data = {};
    for (const key of ROUTINE_WRITABLE) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (data.batch_id) data.batch_id = Number(data.batch_id);
    if (data.time_slot) {
      const parsed = parseTimeSlot(data.time_slot);
      if (data.start_time === undefined) data.start_time = parsed.start_time;
      if (data.end_time === undefined) data.end_time = parsed.end_time;
    }
    data.updated_by = req.user.id;
    await routine.update(data);
    // Frontend expects the updated routine object directly.
    return res.json(routine);
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
