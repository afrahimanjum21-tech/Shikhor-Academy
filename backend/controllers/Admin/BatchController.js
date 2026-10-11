import models, { sequelize } from '../../models/index.js';
import { Op } from 'sequelize';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';

const isValidClassLink = (value) => {
  if (value === undefined || value === null || value === '') return true;
  return typeof value === 'string' && /^https?:\/\/.+/.test(value.trim());
};

export const index = async (req, res) => {
  try {
    const batches = await models.Batch.findAll({
      include: [{ model: models.Course, attributes: ['id', 'title'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ data: batches });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch batches' });
  }
};

export const store = async (req, res) => {
  try {
    const { course_id, name, start_time, end_time, capacity, class_link } = req.body;

    if (!course_id || !name) {
      return res.status(400).json({ message: 'course_id and name are required' });
    }

    if (!isValidClassLink(class_link)) {
      return res.status(400).json({ message: 'class_link must be an http(s) URL' });
    }

    const course = await models.Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const batch = await models.Batch.create({ course_id, name, start_time, end_time, capacity, class_link: class_link || null });

    res.status(201).json({ message: 'Batch created successfully', data: batch });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create batch' });
  }
};

export const show = async (req, res) => {
  try {
    const batch = await models.Batch.findByPk(req.params.id, {
      include: [
        { model: models.Course },
        { model: models.TeacherBatchAssignment, include: [{ model: models.User, as: 'Teacher', attributes: ['id', 'name', 'email'] }] },
        { model: models.Student, attributes: ['id', 'student_id_card_no'] },
      ],
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    res.json({ data: batch });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch batch' });
  }
};

export const update = async (req, res) => {
  try {
    const batch = await models.Batch.findByPk(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const { course_id, name, start_time, end_time, capacity, class_link } = req.body;

    if (!isValidClassLink(class_link)) {
      return res.status(400).json({ message: 'class_link must be an http(s) URL' });
    }

    const updateData = {};
    if (course_id !== undefined) {
      const course = await models.Course.findByPk(course_id);
      if (!course) return res.status(404).json({ message: 'Course not found' });
      updateData.course_id = course_id;
    }
    if (name !== undefined) updateData.name = name;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (class_link !== undefined) updateData.class_link = class_link === '' ? null : class_link;

    await batch.update(updateData);

    res.json({ message: 'Batch updated successfully', data: batch });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update batch' });
  }
};

export const destroy = async (req, res) => {
  try {
    const batch = await models.Batch.findByPk(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const assignments = await models.Assignment.findAll({ where: { batch_id: batch.id }, attributes: ['id', 'attachment_path'] });
    const assignmentIds = assignments.map(a => a.id);

    // H-del2: never silently destroy student work. If any submission exists for
    // this batch's assignments, BLOCK the delete and keep the academic history.
    const submissionCount = assignmentIds.length
      ? await models.AssignmentSubmission.count({ where: { assignment_id: { [Op.in]: assignmentIds } } })
      : 0;
    if (submissionCount > 0) {
      return res.status(409).json({
        message: `This batch has ${submissionCount} student assignment submission(s). Deleting it would destroy student work — reassign or archive the batch instead.`,
      });
    }

    const materials = await models.StudyMaterial.findAll({ where: { batch_id: batch.id }, attributes: ['id', 'file_path'] });

    // H-del3: delete all related rows atomically; roll back on any failure.
    await sequelize.transaction(async (t) => {
      if (assignmentIds.length) {
        // Defensive against a race (a submission arriving after the check above).
        await models.AssignmentSubmission.destroy({ where: { assignment_id: { [Op.in]: assignmentIds } }, transaction: t });
      }
      await models.TeacherBatchAssignment.destroy({ where: { batch_id: batch.id }, transaction: t });
      await models.Routine.destroy({ where: { batch_id: batch.id }, transaction: t });
      await models.Assignment.destroy({ where: { batch_id: batch.id }, transaction: t });
      await models.StudyMaterial.destroy({ where: { batch_id: batch.id }, transaction: t });
      await models.Student.update({ current_batch_id: null }, { where: { current_batch_id: batch.id }, transaction: t });
      await batch.destroy({ transaction: t });
    });

    // Media cleanup is non-transactional — only after the rows are gone.
    for (const a of assignments) {
      if (a.attachment_path) await MediaDeleteService.deleteByUrl(a.attachment_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    for (const m of materials) {
      if (m.file_path) await MediaDeleteService.deleteByUrl(m.file_path).catch(err => console.warn('Media cleanup:', err.message));
    }

    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('BatchController.destroy error:', error);
    res.status(500).json({ message: 'Failed to delete batch' });
  }
};
