import models from '../../models/index.js';
import { Op } from 'sequelize';

export const index = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const assignments = await models.Assignment.findAll({
      where: { teacher_id: teacherId },
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Teacher', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    const data = await Promise.all(assignments.map(async (assignment) => {
      const submissionCount = await models.AssignmentSubmission.count({
        where: { assignment_id: assignment.id },
      });

      return {
        ...assignment.toJSON(),
        submission_count: submissionCount,
      };
    }));

    res.json({ data });
  } catch (error) {
    console.error('TeacherAssignmentController.index error:', error);
    res.status(500).json({ message: 'Failed to fetch assignments', error: error.message });
  }
};

export const store = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batch_id, title, description, subject, due_date, total_marks } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'title is required' });
    }

    if (batch_id) {
      const assignment = await models.TeacherBatchAssignment.findOne({
        where: { teacher_id: teacherId, batch_id },
      });
      if (!assignment) {
        return res.status(403).json({ message: 'You are not assigned to this batch' });
      }
    }

    const assignment = await models.Assignment.create({
      teacher_id: teacherId,
      batch_id: batch_id || null,
      title,
      description: description || null,
      subject: subject || null,
      due_date: due_date || null,
      attachment_path: req.file ? req.file.path.replace(/\\/g, '/') : null,
      total_marks: total_marks || null,
    });

    const result = await models.Assignment.findByPk(assignment.id, {
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Teacher', attributes: ['id', 'name'] },
      ],
    });

    res.status(201).json({ message: 'Assignment created successfully', data: result });
  } catch (error) {
    console.error('TeacherAssignmentController.store error:', error);
    res.status(500).json({ message: 'Failed to create assignment', error: error.message });
  }
};

export const show = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;

    const assignment = await models.Assignment.findOne({
      where: { id, teacher_id: teacherId },
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Teacher', attributes: ['id', 'name'] },
        {
          model: models.AssignmentSubmission,
          include: [{ model: models.Student, include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone', 'profile_photo_path'] }] }],
          order: [['submitted_at', 'DESC']],
        },
      ],
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json({ data: assignment });
  } catch (error) {
    console.error('TeacherAssignmentController.show error:', error);
    res.status(500).json({ message: 'Failed to fetch assignment', error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;
    const { batch_id, title, description, subject, due_date, total_marks } = req.body;

    const assignment = await models.Assignment.findOne({
      where: { id, teacher_id: teacherId },
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found or not owned by you' });
    }

    if (batch_id) {
      const assn = await models.TeacherBatchAssignment.findOne({
        where: { teacher_id: teacherId, batch_id },
      });
      if (!assn) {
        return res.status(403).json({ message: 'You are not assigned to this batch' });
      }
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (subject !== undefined) updates.subject = subject;
    if (due_date !== undefined) updates.due_date = due_date;
    if (total_marks !== undefined) updates.total_marks = total_marks;
    if (batch_id !== undefined) updates.batch_id = batch_id;
    if (req.file) updates.attachment_path = req.file.path.replace(/\\/g, '/');

    await assignment.update(updates);

    const result = await models.Assignment.findByPk(id, {
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Teacher', attributes: ['id', 'name'] },
      ],
    });

    res.json({ message: 'Assignment updated successfully', data: result });
  } catch (error) {
    console.error('TeacherAssignmentController.update error:', error);
    res.status(500).json({ message: 'Failed to update assignment', error: error.message });
  }
};

export const destroy = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;

    const assignment = await models.Assignment.findOne({
      where: { id, teacher_id: teacherId },
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found or not owned by you' });
    }

    await models.AssignmentSubmission.destroy({ where: { assignment_id: id } });
    await assignment.destroy();

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('TeacherAssignmentController.destroy error:', error);
    res.status(500).json({ message: 'Failed to delete assignment', error: error.message });
  }
};

export const gradeSubmission = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { submissionId } = req.params;
    const { marks_obtained, feedback } = req.body;

    if (marks_obtained === undefined) {
      return res.status(400).json({ message: 'marks_obtained is required' });
    }

    const submission = await models.AssignmentSubmission.findByPk(submissionId, {
      include: [
        {
          model: models.Assignment,
          where: { teacher_id: teacherId },
          required: true,
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found or not associated with your assignment' });
    }

    submission.marks_obtained = marks_obtained;
    submission.feedback = feedback || null;
    submission.status = 'graded';
    await submission.save();

    res.json({ message: 'Submission graded successfully', data: submission });
  } catch (error) {
    console.error('TeacherAssignmentController.gradeSubmission error:', error);
    res.status(500).json({ message: 'Failed to grade submission', error: error.message });
  }
};
