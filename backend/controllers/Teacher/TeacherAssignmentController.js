import models from '../../models/index.js';
import { Op } from 'sequelize';
import MediaService from '../../services/media/MediaService.js';
import MediaDeleteService from '../../services/media/MediaDeleteService.js';
import NotificationService from '../../services/NotificationService.js';

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

    const assignmentIds = assignments.map(a => a.id);
    const submissionCounts = assignmentIds.length > 0 ? await models.AssignmentSubmission.count({
      where: { assignment_id: { [Op.in]: assignmentIds } },
      attributes: ['assignment_id'],
      group: ['assignment_id'],
    }) : [];

    const countMap = {};
    submissionCounts.forEach(sc => { countMap[sc.assignment_id] = parseInt(sc.count); });

    const data = assignments.map((assignment) => {
      return {
        ...assignment.toJSON(),
        submission_count: countMap[assignment.id] || 0,
      };
    });

    res.json({ data });
  } catch (error) {
    console.error('TeacherAssignmentController.index error:', error);
    res.status(500).json({ message: 'Failed to fetch assignments' });
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

    let attachment_path = null;
    if (req.file) {
      const uploadResult = await MediaService.upload(req.file, { bucket: 'assignments', folder: 'general' });
      attachment_path = uploadResult.url;
    }

    const assignment = await models.Assignment.create({
      teacher_id: teacherId,
      batch_id: batch_id || null,
      title,
      description: description || null,
      subject: subject || null,
      due_date: due_date || null,
      attachment_path,
      total_marks: total_marks || null,
    });

    const result = await models.Assignment.findByPk(assignment.id, {
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        { model: models.User, as: 'Teacher', attributes: ['id', 'name'] },
      ],
    });

    if (assignment.batch_id) {
      try {
        await NotificationService.createForBatch({
          batchId: assignment.batch_id,
          type: 'assignment',
          title: 'New Assignment',
          body: `"${assignment.title}"${due_date ? ` is due ${due_date}` : ''}.`,
          actionUrl: '/student/assignments',
          actionLabel: 'View Assignment',
        });
      } catch (notifErr) {
        console.error('Failed to send assignment notification:', notifErr);
      }
    }

    res.status(201).json({ message: 'Assignment created successfully', data: result });
  } catch (error) {
    console.error('TeacherAssignmentController.store error:', error);
    res.status(500).json({ message: 'Failed to create assignment' });
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
    res.status(500).json({ message: 'Failed to fetch assignment' });
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
    if (req.file) {
      const uploadResult = await MediaService.upload(req.file, { bucket: 'assignments', folder: 'general' });
      if (assignment.attachment_path) {
        await MediaDeleteService.deleteByUrl(assignment.attachment_path).catch(err => console.warn('Media cleanup:', err.message));
      }
      updates.attachment_path = uploadResult.url;
    }

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
    res.status(500).json({ message: 'Failed to update assignment' });
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

    if (assignment.attachment_path) {
      await MediaDeleteService.deleteByUrl(assignment.attachment_path).catch(err => console.warn('Media cleanup:', err.message));
    }
    const submissions = await models.AssignmentSubmission.findAll({ where: { assignment_id: id } });
    for (const sub of submissions) {
      if (sub.submission_file_path) {
        await MediaDeleteService.deleteByUrl(sub.submission_file_path).catch(err => console.warn('Media cleanup:', err.message));
      }
    }
    await models.AssignmentSubmission.destroy({ where: { assignment_id: id } });
    await assignment.destroy();

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('TeacherAssignmentController.destroy error:', error);
    res.status(500).json({ message: 'Failed to delete assignment' });
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

    try {
      const student = await models.Student.findByPk(submission.student_id, { attributes: ['user_id'] });
      if (student?.user_id) {
        await NotificationService.create({
          userId: student.user_id,
          type: 'assignment',
          title: 'Assignment Graded',
          body: `Your submission for "${submission.Assignment?.title || 'an assignment'}" has been graded (${marks_obtained} marks).`,
          actionUrl: '/student/assignment-results',
          actionLabel: 'View Result',
        });
      }
    } catch (notifErr) {
      console.error('Failed to send grade notification:', notifErr);
    }

    res.json({ message: 'Submission graded successfully', data: submission });
  } catch (error) {
    console.error('TeacherAssignmentController.gradeSubmission error:', error);
    res.status(500).json({ message: 'Failed to grade submission' });
  }
};
