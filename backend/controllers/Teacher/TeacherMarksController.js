import models from '../../models/index.js';
import { Op } from 'sequelize';
import GradeService from '../../services/GradeService.js';

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
    res.status(500).json({ message: 'Failed to fetch exams', error: error.message });
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

    const assignment = await models.TeacherBatchAssignment.findOne({
      where: { teacher_id: teacherId, batch_id: { [Op.in]: courseIds } },
    });

    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this exam\'s course' });
    }

    const students = await models.Student.findAll({
      where: { current_batch_id: { [Op.in]: courseIds } },
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
    res.status(500).json({ message: 'Failed to fetch students for exam', error: error.message });
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

    const courseIds = await models.Batch.findAll({
      where: { course_id: exam.course_id },
      attributes: ['id'],
    }).then(rows => rows.map(r => r.id));

    const assignment = await models.TeacherBatchAssignment.findOne({
      where: { teacher_id: teacherId, batch_id: { [Op.in]: courseIds } },
    });

    if (!assignment) {
      return res.status(403).json({ message: 'You are not assigned to this exam\'s course' });
    }

    const results = await Promise.all(marks.map(async (entry) => {
      const totalObtained = GradeService.calculateTotalObtained(entry.marks_details);
      const totalMarks = exam.total_marks || 100;
      const gradeInfo = GradeService.calculate(totalObtained, totalMarks);

      const [result] = await models.ExamResult.upsert({
        exam_id,
        student_id: entry.student_id,
        marks_details: entry.marks_details,
        total_obtained: totalObtained,
        grade: gradeInfo.grade,
        gpa: gradeInfo.gpa,
        teacher_comment: entry.teacher_comment || null,
      });

      return result;
    }));

    res.json({ message: 'Marks saved successfully', count: results.length });
  } catch (error) {
    console.error('TeacherMarksController.saveMarks error:', error);
    res.status(500).json({ message: 'Failed to save marks', error: error.message });
  }
};
