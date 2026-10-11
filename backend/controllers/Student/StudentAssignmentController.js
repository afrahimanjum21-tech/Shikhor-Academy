import models from '../../models/index.js';
import MediaService from '../../services/media/MediaService.js';
import { todayLocalDate } from '../../services/attendanceSession.js';

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
      // The student panel renders one `submission` per assignment, so flatten
      // the (usually single-row, student-scoped) include into `submission`.
      const json = assignment.toJSON();
      delete json.AssignmentSubmissions;
      json.submission = Array.isArray(assignment.AssignmentSubmissions)
        ? assignment.AssignmentSubmissions[0] || null
        : null;
      grouped[teacherId].assignments.push(json);
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

    // K: keep the current policy — late submissions ARE accepted (no grace
    // period invented, resubmission block above preserved) — but record the
    // lateness explicitly instead of silently, by comparing against the
    // assignment's due_date in the school's local (Dhaka) calendar.
    const isLate = assignment.due_date ? todayLocalDate() > String(assignment.due_date) : false;

    const submission = await models.AssignmentSubmission.create({
      assignment_id: assignmentId,
      student_id: student.id,
      submission_file_path,
      submission_text: submission_text || null,
      status: isLate ? 'late' : 'submitted',
      submitted_at: new Date(),
    });

    res.status(201).json({
      message: isLate ? 'Assignment submitted late' : 'Assignment submitted successfully',
      data: { ...submission.toJSON(), is_late: isLate },
    });
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
      const dueDate = assignment.due_date || null;
      const submittedDate = json.submitted_at ? new Date(json.submitted_at).toISOString().slice(0, 10) : null;
      // Lateness survives grading (which overwrites status to 'graded') by also
      // deriving it from submitted_at vs due_date.
      const is_late = json.status === 'late' || !!(dueDate && submittedDate && submittedDate > dueDate);
      grouped[teacherId].results.push({
        id: json.id,
        title: assignment.title || 'Untitled Assignment',
        subject: assignment.subject || null,
        total_marks: assignment.total_marks ?? null,
        marks_obtained: json.marks_obtained ?? null,
        status: json.status || 'submitted',
        submitted_at: json.submitted_at || null,
        due_date: dueDate,
        is_late,
        feedback: json.feedback || null,
      });
    });

    res.json({ data: Object.values(grouped) });
  } catch (error) {
    console.error('StudentAssignmentController.results error:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
};
