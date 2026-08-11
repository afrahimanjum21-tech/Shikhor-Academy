import models from '../../models/index.js';
import MediaService from '../../services/media/MediaService.js';

export const index = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const assignments = await models.Assignment.findAll({
      where: {
        batch_id: student.current_batch_id,
      },
      include: [
        { model: models.Batch, attributes: ['id', 'name'] },
        {
          model: models.User,
          as: 'Teacher',
          attributes: ['id', 'name', 'profile_photo_path'],
          include: [{ model: models.TeacherProfile, attributes: ['designation', 'subject'] }],
        },
        {
          model: models.AssignmentSubmission,
          where: { student_id: student.id },
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Group into the shape the student panel renders:
    // [{ teacher: {id, name, profile_photo_url, designation, subject}, assignments: [...] }]
    const grouped = {};
    assignments.forEach((assignment) => {
      const teacher = assignment.Teacher || {};
      const teacherId = teacher.id || 'unknown';
      if (!grouped[teacherId]) {
        grouped[teacherId] = {
          teacher: {
            id: teacherId,
            name: teacher.name || 'Unknown',
            profile_photo_url: teacher.profile_photo_path || null,
            designation: teacher.TeacherProfile?.designation || null,
            subject: teacher.TeacherProfile?.subject || null,
          },
          assignments: [],
        };
      }
      grouped[teacherId].assignments.push(assignment);
    });

    res.json({ data: Object.values(grouped) });
  } catch (error) {
    console.error('StudentAssignmentController.index error:', error);
    res.status(500).json({ message: 'Failed to fetch assignments' });
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

    // Enforce batch-level authorization: a student may only submit
    // assignments that belong to their current batch.
    if (assignment.batch_id !== student.current_batch_id) {
      return res.status(403).json({ message: 'You are not enrolled in the batch this assignment belongs to' });
    }

    const existing = await models.AssignmentSubmission.findOne({
      where: { assignment_id: assignmentId, student_id: student.id },
    });

    if (existing) {
      return res.status(400).json({ message: 'You have already submitted this assignment' });
    }

    let submission_file_path = null;
    if (req.file) {
      const uploadResult = await MediaService.upload(req.file, { bucket: 'submissions', folder: 'assignments' });
      submission_file_path = uploadResult.url;
    }

    const submission = await models.AssignmentSubmission.create({
      assignment_id: assignmentId,
      student_id: student.id,
      submission_file_path,
      submission_text: submission_text || null,
      status: 'submitted',
      submitted_at: new Date(),
    });

    res.status(201).json({ message: 'Assignment submitted successfully', data: submission });
  } catch (error) {
    console.error('StudentAssignmentController.submit error:', error);
    res.status(500).json({ message: 'Failed to submit assignment' });
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
      },
      include: [
        {
          model: models.Assignment,
          include: [
            { model: models.Batch, attributes: ['id', 'name'] },
            {
              model: models.User,
              as: 'Teacher',
              attributes: ['id', 'name', 'profile_photo_path'],
              include: [{ model: models.TeacherProfile, attributes: ['designation', 'subject'] }],
            },
          ],
        },
      ],
      order: [['submitted_at', 'DESC']],
    });

    // Group into the shape the student panel renders:
    // [{ teacher: {id, name, profile_photo_url, designation, subject}, results: [...] }]
    const grouped = {};
    submissions.forEach((submission) => {
      const json = submission.toJSON();
      const assignment = json.Assignment || {};
      const teacher = assignment.Teacher || {};
      const teacherId = teacher.id || 'unknown';
      if (!grouped[teacherId]) {
        grouped[teacherId] = {
          teacher: {
            id: teacherId,
            name: teacher.name || 'Unknown',
            profile_photo_url: teacher.profile_photo_path || null,
            designation: teacher.TeacherProfile?.designation || null,
            subject: teacher.TeacherProfile?.subject || null,
          },
          results: [],
        };
      }
      grouped[teacherId].results.push({
        id: json.id,
        title: assignment.title || 'Untitled Assignment',
        subject: assignment.subject || null,
        total_marks: assignment.total_marks ?? null,
        marks_obtained: json.marks_obtained ?? null,
        status: json.status || 'submitted',
        submitted_at: json.submitted_at || null,
        feedback: json.feedback || null,
      });
    });

    res.json({ data: Object.values(grouped) });
  } catch (error) {
    console.error('StudentAssignmentController.results error:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
};
