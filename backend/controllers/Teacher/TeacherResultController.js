import models from '../../models/index.js';
import { Op } from 'sequelize';
import GradeService from '../../services/GradeService.js';
import NotificationService from '../../services/NotificationService.js';

const STUDENT_USER_ATTRIBUTES = ['id', 'name', 'email', 'phone', 'profile_photo_path'];

const requireAssignment = async (teacherId, batchId, subject) => {
  const assignment = await models.TeacherBatchAssignment.findOne({
    where: { teacher_id: teacherId, batch_id: Number(batchId), subject },
  });
  if (!assignment) return null;
  return assignment;
};

// A teacher may publish a subject for an exam only if they teach that subject
// in at least one batch of the exam's course.
const requireSubjectAssignmentForCourse = async (teacherId, subject, courseId) => {
  const rows = await models.TeacherBatchAssignment.findAll({
    where: { teacher_id: teacherId, subject },
    include: [{ model: models.Batch, attributes: ['id', 'course_id'] }],
  });
  return rows.some(r => r.Batch && Number(r.Batch.course_id) === Number(courseId));
};

export const myAssignments = async (req, res) => {
  try {
    const rows = await models.TeacherBatchAssignment.findAll({
      where: { teacher_id: req.user.id },
      include: [{
        model: models.Batch,
        include: [{ model: models.Course, attributes: ['id', 'title'] }],
      }],
      order: [['batch_id', 'ASC'], ['id', 'ASC']],
    });

    const courses = {};
    for (const row of rows) {
      const batch = row.Batch;
      if (!batch) continue;
      const courseId = Number(batch.course_id);
      if (!courses[courseId]) {
        courses[courseId] = {
          course_id: courseId,
          course_title: batch.Course?.title || `Course #${courseId}`,
          batches: {},
        };
      }
      const course = courses[courseId];
      if (!course.batches[batch.id]) {
        course.batches[batch.id] = { batch_id: batch.id, batch_name: batch.name, subjects: [] };
      }
      const entry = course.batches[batch.id];
      if (row.subject && !entry.subjects.includes(row.subject)) {
        entry.subjects.push(row.subject);
      }
    }

    const data = Object.values(courses).map(course => ({
      ...course,
      batches: Object.values(course.batches),
    }));

    res.json({ data });
  } catch (error) {
    console.error('TeacherResultController.myAssignments error:', error);
    res.status(500).json({ message: 'Failed to fetch assignments' });
  }
};

export const getExams = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { course_id, batch_id, subject } = req.query;
    if (!course_id || !batch_id || !subject) {
      return res.status(400).json({ message: 'course_id, batch_id and subject are required' });
    }

    const assignment = await requireAssignment(teacherId, batch_id, subject);
    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to teach this subject in this batch' });
    }

    const batch = await models.Batch.findByPk(batch_id, { attributes: ['id', 'name', 'course_id'] });
    if (!batch || Number(batch.course_id) !== Number(course_id)) {
      return res.status(400).json({ message: 'Batch does not belong to the selected class' });
    }

    const exams = await models.Exam.findAll({
      where: { course_id: Number(course_id) },
      order: [['date', 'DESC'], ['id', 'DESC']],
    });

    const studentCount = await models.Student.count({ where: { current_batch_id: batch_id } });

    const list = exams
      .filter(exam => Array.isArray(exam.subjects) && exam.subjects.includes(subject))
      .map(exam => ({
        id: exam.id,
        name: exam.name,
        type: exam.type,
        date: exam.date,
        total_marks: exam.total_marks,
        full_marks: exam.subject_marks?.[subject] ?? exam.total_marks ?? 100,
        subject_published: (exam.published_subjects || []).includes(subject),
        student_count: studentCount,
      }));

    res.json({
      data: {
        subject,
        batch: { id: batch.id, name: batch.name },
        exams: list,
      },
    });
  } catch (error) {
    console.error('TeacherResultController.getExams error:', error);
    res.status(500).json({ message: 'Failed to fetch exams' });
  }
};

export const getStudents = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { exam_id, batch_id, subject } = req.query;
    if (!exam_id || !batch_id || !subject) {
      return res.status(400).json({ message: 'exam_id, batch_id and subject are required' });
    }

    const assignment = await requireAssignment(teacherId, batch_id, subject);
    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to teach this subject in this batch' });
    }

    const exam = await models.Exam.findByPk(exam_id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const batch = await models.Batch.findByPk(batch_id, { attributes: ['id', 'course_id'] });
    if (!batch || Number(batch.course_id) !== Number(exam.course_id)) {
      return res.status(400).json({ message: 'Exam does not belong to the selected batch class' });
    }
    if (!Array.isArray(exam.subjects) || !exam.subjects.includes(subject)) {
      return res.status(400).json({ message: 'This subject is not part of the selected exam' });
    }

    const students = await models.Student.findAll({
      where: { current_batch_id: Number(batch_id) },
      include: [{ model: models.User, attributes: STUDENT_USER_ATTRIBUTES }],
      order: [['admission_date', 'ASC']],
    });

    const results = await models.ExamResult.findAll({
      where: { exam_id: exam.id, student_id: { [Op.in]: students.map(s => s.id) } },
    });
    const resultMap = {};
    results.forEach(r => { resultMap[r.student_id] = r; });

    const list = students.map(student => {
      const result = resultMap[student.id];
      return {
        student,
        obtained: result?.marks_details?.[subject] != null ? result.marks_details[subject] : '',
        teacher_comment: result?.teacher_comment || '',
      };
    });

    res.json({
      data: {
        exam: {
          id: exam.id,
          name: exam.name,
          type: exam.type,
          date: exam.date,
          total_marks: exam.total_marks,
        },
        subject,
        full_marks: exam.subject_marks?.[subject] ?? exam.total_marks ?? 100,
        published: (exam.published_subjects || []).includes(subject),
        students: list,
      },
    });
  } catch (error) {
    console.error('TeacherResultController.getStudents error:', error);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
};

export const saveMarks = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { exam_id, batch_id, subject, marks } = req.body;

    if (!exam_id || !batch_id || !subject || !Array.isArray(marks)) {
      return res.status(400).json({ message: 'exam_id, batch_id, subject and a marks array are required' });
    }

    const assignment = await requireAssignment(teacherId, batch_id, subject);
    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to teach this subject in this batch' });
    }

    const exam = await models.Exam.findByPk(exam_id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const batch = await models.Batch.findByPk(batch_id, { attributes: ['course_id'] });
    if (!batch || Number(batch.course_id) !== Number(exam.course_id)) {
      return res.status(400).json({ message: 'Exam does not belong to the selected batch class' });
    }
    if (!Array.isArray(exam.subjects) || !exam.subjects.includes(subject)) {
      return res.status(400).json({ message: 'This subject is not part of the selected exam' });
    }

    const studentIds = marks.map(m => m.student_id);
    const validStudents = await models.Student.findAll({
      where: { id: { [Op.in]: studentIds }, current_batch_id: Number(batch_id) },
      attributes: ['id'],
    });
    if (validStudents.length !== new Set(studentIds).size) {
      return res.status(400).json({ message: 'Some students do not belong to the selected batch' });
    }

    const fullMarks = Number(exam.subject_marks?.[subject] ?? exam.total_marks ?? 100);
    const totalMarks = Number(exam.total_marks || 0);
    const results = await Promise.all(marks.map(async (entry) => {
      const obtained = Math.min(Math.max(Number(entry.obtained) || 0, 0), fullMarks);

      const values = {
        marks_details: {},
        total_obtained: 0,
        grade: 'F',
        gpa: 0,
      };
      const [result] = await models.ExamResult.findOrCreate({
        where: { exam_id: exam.id, student_id: entry.student_id },
        defaults: values,
      });

      const details = { ...(result.marks_details || {}), [subject]: obtained };
      const totalObtained = GradeService.calculateTotalObtained(details);
      const gradeInfo = GradeService.calculate(totalObtained, totalMarks);

      await result.update({
        marks_details: details,
        total_obtained: totalObtained,
        grade: gradeInfo.grade,
        gpa: gradeInfo.gpa,
        teacher_id: teacherId,
        teacher_comment: entry.teacher_comment != null ? entry.teacher_comment : result.teacher_comment,
      });

      return result;
    }));

    res.json({ message: 'Marks saved successfully', count: results.length });
  } catch (error) {
    console.error('TeacherResultController.saveMarks error:', error);
    res.status(500).json({ message: 'Failed to save marks' });
  }
};

export const togglePublish = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { exam_id, subject, publish } = req.body;
    if (!exam_id || !subject || typeof publish !== 'boolean') {
      return res.status(400).json({ message: 'exam_id, subject and publish flag are required' });
    }

    const exam = await models.Exam.findByPk(exam_id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    if (!Array.isArray(exam.subjects) || !exam.subjects.includes(subject)) {
      return res.status(400).json({ message: 'This subject is not part of the selected exam' });
    }

    const allowed = await requireSubjectAssignmentForCourse(teacherId, subject, exam.course_id);
    if (!allowed) {
      return res.status(403).json({ message: 'You are not assigned to teach this subject in this exam\'s class' });
    }

    const published = exam.published_subjects || [];
    let nextPublished;
    if (publish && !published.includes(subject)) {
      nextPublished = [...published, subject];
    } else if (!publish && published.includes(subject)) {
      nextPublished = published.filter(s => s !== subject);
    } else {
      nextPublished = published;
    }

    await exam.update({ published_subjects: nextPublished });

    if (publish) {
      try {
        const batchRows = await models.TeacherBatchAssignment.findAll({
          where: { teacher_id: teacherId, subject },
          attributes: ['batch_id'],
          include: [{ model: models.Batch, attributes: ['course_id'] }],
        });
        const batchIds = batchRows
          .filter(r => r.Batch && Number(r.Batch.course_id) === Number(exam.course_id))
          .map(r => r.batch_id);
        if (batchIds.length > 0) {
          const students = await models.Student.findAll({
            where: { current_batch_id: { [Op.in]: batchIds } },
            attributes: ['user_id'],
          });
          await NotificationService.createForStudents({
            userIds: students.map(s => s.user_id),
            type: 'exam',
            title: `Result Published: ${subject}`,
            body: `Your ${subject} result for "${exam.name}" is now available.`,
            actionUrl: '/student/results',
            actionLabel: 'View Result',
          });
        }
      } catch (notifErr) {
        console.error('Failed to send subject result notification:', notifErr);
      }
    }

    res.json({ message: `Result ${publish ? 'published' : 'unpublished'} successfully`, data: { subject, published: nextPublished.includes(subject) } });
  } catch (error) {
    console.error('TeacherResultController.togglePublish error:', error);
    res.status(500).json({ message: 'Failed to update publish status' });
  }
};
