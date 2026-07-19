import models from '../../models/index.js';
import { Op } from 'sequelize';

export const index = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const assignments = await models.Assignment.findAll({
      where: {
        batch_id: student.current_batch_id || { [Op.ne]: null },
      },
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Teacher', attributes: ['id', 'name'] },
        {
          model: models.AssignmentSubmission,
          where: { student_id: student.id },
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const grouped = {};
    assignments.forEach((assignment) => {
      const teacherName = assignment.Teacher?.name || 'Unknown';
      if (!grouped[teacherName]) {
        grouped[teacherName] = [];
      }
      grouped[teacherName].push(assignment);
    });

    res.json({ data: grouped });
  } catch (error) {
    console.error('StudentAssignmentController.index error:', error);
    res.status(500).json({ message: 'Failed to fetch assignments', error: error.message });
  }
};

export const submit = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { assignmentId } = req.params;
    const { submission_text } = req.body;

    const assignment = await models.Assignment.findByPk(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    const existing = await models.AssignmentSubmission.findOne({
      where: { assignment_id: assignmentId, student_id: student.id },
    });

    if (existing) {
      return res.status(400).json({ message: 'You have already submitted this assignment' });
    }

    const submission = await models.AssignmentSubmission.create({
      assignment_id: assignmentId,
      student_id: student.id,
      submission_file_path: req.file ? req.file.path.replace(/\\/g, '/') : null,
      submission_text: submission_text || null,
      status: 'submitted',
      submitted_at: new Date(),
    });

    res.status(201).json({ message: 'Assignment submitted successfully', data: submission });
  } catch (error) {
    console.error('StudentAssignmentController.submit error:', error);
    res.status(500).json({ message: 'Failed to submit assignment', error: error.message });
  }
};

export const results = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const submissions = await models.AssignmentSubmission.findAll({
      where: {
        student_id: student.id,
        status: 'graded',
      },
      include: [
        {
          model: models.Assignment,
          include: [
            { model: models.Batch, attributes: ['id', 'name'] },
            { model: models.User, as: 'Teacher', attributes: ['id', 'name'] },
          ],
        },
      ],
      order: [['submitted_at', 'DESC']],
    });

    res.json({ data: submissions });
  } catch (error) {
    console.error('StudentAssignmentController.results error:', error);
    res.status(500).json({ message: 'Failed to fetch results', error: error.message });
  }
};
