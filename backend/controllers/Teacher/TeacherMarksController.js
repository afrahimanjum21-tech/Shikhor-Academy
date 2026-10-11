import models from '../../models/index.js';
import { Op } from 'sequelize';
import ExamResultService from '../../services/ExamResultService.js';
import { validateMarksDetails } from '../../services/marksValidation.js';

export const getExams = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const batchIds = await models.TeacherBatchAssignment.findAll({
      where: { teacher_id: teacherId },
      attributes: ['batch_id'],
    }).then(rows => rows.map(r => r.batch_id));

    const courseIds = await models.Batch.findAll({
      where: { id: { [Op.in]: batchIds } },
      attributes: ['course_id'],
    }).then(rows => [...new Set(rows.map(r => r.course_id))]);

    const exams = await models.Exam.findAll({
      where: { course_id: { [Op.in]: courseIds } },
      include: [{ model: models.Course, attributes: ['id', 'title'] }],
      order: [['date', 'DESC']],
    });

    res.json({ data: exams });
  } catch (error) {
    console.error('TeacherMarksController.getExams error:', error);
    res.status(500).json({ message: 'Failed to fetch exams' });
  }
};

export const getStudentsForExam = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { examId } = req.params;

    const exam = await models.Exam.findByPk(examId, {
      include: [{ model: models.Course }],
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const courseIds = await models.Batch.findAll({
      where: { course_id: exam.course_id },
      attributes: ['id'],
    }).then(rows => rows.map(r => r.id));

    // The teacher's OWN assigned batches within this course — not every batch
    // of the course. getStudentsForExam previously listed students (with their
    // name/email/phone/photo PII) for ALL course batches, leaking sibling-batch
    // students the teacher does not teach. Scope to the assigned batches, the
    // same authorization model as saveMarks / TeacherResultController.
    const assignments = await models.TeacherBatchAssignment.findAll({
      where: { teacher_id: teacherId, batch_id: { [Op.in]: courseIds } },
      attributes: ['batch_id'],
    });

    if (assignments.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this exam\'s course' });
    }

    const assignedBatchIds = [...new Set(assignments.map(a => a.batch_id))];

    const students = await models.Student.findAll({
      where: { current_batch_id: { [Op.in]: assignedBatchIds } },
      include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone', 'profile_photo_path'] }],
      order: [['admission_date', 'ASC']],
    });

    const existingResults = await models.ExamResult.findAll({
      where: { exam_id: examId },
    });

    const resultMap = {};
    existingResults.forEach(r => { resultMap[r.student_id] = r; });

    const data = students.map(student => ({
      student,
      result: resultMap[student.id] || null,
    }));

    res.json({ data: { exam, students: data } });
  } catch (error) {
    console.error('TeacherMarksController.getStudentsForExam error:', error);
    res.status(500).json({ message: 'Failed to fetch students for exam' });
  }
};

export const saveMarks = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { exam_id, marks } = req.body;

    if (!exam_id || !marks || !Array.isArray(marks)) {
      return res.status(400).json({ message: 'exam_id and marks array are required' });
    }

    const exam = await models.Exam.findByPk(exam_id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const courseBatchIds = await models.Batch.findAll({
      where: { course_id: exam.course_id },
      attributes: ['id'],
    }).then(rows => rows.map(r => r.id));

    // The teacher's own assignments within this course decide BOTH which
    // batches' students and which subjects they may write. This endpoint
    // previously only checked a course-level assignment and then wrote the
    // ENTIRE marks_details object for any student in the course — letting a
    // teacher overwrite subjects they do not teach, mark students in batches
    // they are not assigned to, and clobber marks entered via
    // /teacher/results/marks. We now scope to the teacher's assigned batches
    // and subjects (same authorization model as TeacherResultController).
    const assignments = await models.TeacherBatchAssignment.findAll({
      where: { teacher_id: teacherId, batch_id: { [Op.in]: courseBatchIds } },
      attributes: ['batch_id', 'subject'],
    });
    if (assignments.length === 0) {
      return res.status(403).json({ message: 'You are not assigned to this exam\'s course' });
    }

    const assignedBatchIds = [...new Set(assignments.map(a => a.batch_id))];
    const examSubjects = Array.isArray(exam.subjects) ? exam.subjects : [];
    const allowedSubjects = new Set(
      assignments.map(a => a.subject).filter(s => s != null && examSubjects.includes(s))
    );
    if (allowedSubjects.size === 0) {
      return res.status(403).json({ message: 'You are not assigned to teach any subject in this exam' });
    }

    // Students must be in a batch THIS teacher is assigned to (not merely the
    // course), mirroring /teacher/results/marks.
    const studentIds = marks.map(m => m.student_id);
    const validStudents = await models.Student.findAll({
      where: { id: { [Op.in]: studentIds }, current_batch_id: { [Op.in]: assignedBatchIds } },
      attributes: ['id'],
    });
    if (validStudents.length !== new Set(studentIds).size) {
      return res.status(400).json({ message: 'Some students are not in a batch you are assigned to' });
    }

    // I-14: validate the incoming marks for the subjects this teacher may write
    // and reject the whole batch on any invalid value (never persist partial).
    const cleanByStudent = new Map();
    for (const entry of marks) {
      const incoming = entry.marks_details && typeof entry.marks_details === 'object' ? entry.marks_details : {};
      const check = validateMarksDetails(exam, incoming, allowedSubjects);
      if (!check.ok) {
        return res.status(400).json({ message: `Student ${entry.student_id}: ${check.reason}` });
      }
      cleanByStudent.set(entry.student_id, check.clean);
    }

    await Promise.all(marks.map(async (entry) => {
      const [result] = await models.ExamResult.findOrCreate({
        where: { exam_id, student_id: entry.student_id },
        defaults: { marks_details: {}, total_obtained: 0, grade: 'F', gpa: 0 },
      });

      // Merge ONLY the subjects this teacher is allowed to write; preserve every
      // other subject already recorded (e.g. by a different subject teacher).
      const details = { ...(result.marks_details || {}), ...cleanByStudent.get(entry.student_id) };

      // Canonical computation (per-subject full marks), same service the admin
      // path and the student/enriched views use — no more total_marks||100.
      const calc = ExamResultService.computeForExam(exam, details);
      await result.update({
        marks_details: details,
        total_obtained: calc.total_obtained,
        grade: calc.grade,
        gpa: calc.gpa,
        teacher_id: teacherId,
        teacher_comment: entry.teacher_comment != null ? entry.teacher_comment : result.teacher_comment,
      });
    }));

    // Persist canonical grade/gpa + competition rank for every student (I-4).
    await ExamResultService.recomputeExam(exam);

    res.json({ message: 'Marks saved successfully', count: marks.length });
  } catch (error) {
    console.error('TeacherMarksController.saveMarks error:', error);
    res.status(500).json({ message: 'Failed to save marks' });
  }
};
