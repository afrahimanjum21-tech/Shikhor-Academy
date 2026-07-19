import models from '../../models/index.js';

export const index = async (req, res) => {
  try {
    const batches = await models.Batch.findAll({
      include: [{ model: models.Course, attributes: ['id', 'title'] }],
      order: [['created_at', 'DESC']],
    });
    res.json({ data: batches });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch batches', error: error.message });
  }
};

export const store = async (req, res) => {
  try {
    const { course_id, name, start_time, end_time, capacity } = req.body;

    if (!course_id || !name) {
      return res.status(400).json({ message: 'course_id and name are required' });
    }

    const course = await models.Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const batch = await models.Batch.create({ course_id, name, start_time, end_time, capacity });

    res.status(201).json({ message: 'Batch created successfully', data: batch });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create batch', error: error.message });
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
    res.status(500).json({ message: 'Failed to fetch batch', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const batch = await models.Batch.findByPk(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const { course_id, name, start_time, end_time, capacity } = req.body;

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

    await batch.update(updateData);

    res.json({ message: 'Batch updated successfully', data: batch });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update batch', error: error.message });
  }
};

export const destroy = async (req, res) => {
  try {
    const batch = await models.Batch.findByPk(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    await models.TeacherBatchAssignment.destroy({ where: { batch_id: batch.id } });
    await models.Routine.destroy({ where: { batch_id: batch.id } });
    await models.Assignment.destroy({ where: { batch_id: batch.id } });
    await models.StudyMaterial.destroy({ where: { batch_id: batch.id } });
    await models.Student.update({ current_batch_id: null }, { where: { current_batch_id: batch.id } });

    await batch.destroy();

    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete batch', error: error.message });
  }
};
