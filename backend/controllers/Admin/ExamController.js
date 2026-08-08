import models from '../../models/index.js';
import GradeService from '../../services/GradeService.js';
import { Op } from 'sequelize';
import NotificationService from '../../services/NotificationService.js';

export const index = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows, count } = await models.Exam.findAndCountAll({
      include: [{ model: models.Course, attributes: ['id', 'title'] }],
      order: [['date', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      data: rows,
      current_page: page,
      last_page: Math.ceil(count / limit),
      per_page: limit,
      total: count,
    });
  } catch (error) {
    console.error('ExamController.index error:', error);
    return res.status(500).json({ message: 'Failed to fetch exams' });
  }
};

export const store = async (req, res) => {
  try {
    const { course_id, name, subjects, subject_marks, total_marks, date, type } = req.body;

    const exam = await models.Exam.create({
      course_id,
      name,
      subjects: subjects || null,
      subject_marks: subject_marks || null,
      total_marks: total_marks || null,
      date: date || null,
      type: type || null,
    });

    return res.status(201).json({ message: 'Exam created successfully', data: exam });
  } catch (error) {
    console.error('ExamController.store error:', error);
    return res.status(500).json({ message: 'Failed to create exam' });
  }
};

export const getExamData = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await models.Exam.findByPk(id, {
      include: [{ model: models.Course, attributes: ['id', 'title'] }],
    });

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const students = await models.Student.findAll({
      where: { current_batch_id: { [Op.ne]: null } },
      include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone'] }],
      attributes: ['id', 'user_id', 'student_id_card_no', 'current_batch_id'],
    });

    const results = await models.ExamResult.findAll({
      where: { exam_id: id },
      include: [{ model: models.Student, include: [{ model: models.User, attributes: ['name', 'email'] }] }],
    });

    return res.json({ data: { exam, students, results } });
  } catch (error) {
    console.error('ExamController.getExamData error:', error);
    return res.status(500).json({ message: 'Failed to fetch exam data' });
  }
};

export const storeMarks = async (req, res) => {
  try {
    const { exam_id, marks_data, marks_details } = req.body;

    const entries = marks_data || marks_details;
    if (!exam_id || !entries || !Array.isArray(entries)) {
      return res.status(400).json({ message: 'exam_id and a marks array are required' });
    }

    const exam = await models.Exam.findByPk(exam_id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const results = [];

    for (const entry of entries) {
      const student_id = entry.student_id;
      const subjectMarks = entry.details || entry.marks_details || {};
      const teacher_comment = entry.teacher_comment;

      const totalObtained = GradeService.calculateTotalObtained(subjectMarks);
      const { grade, gpa } = GradeService.calculate(totalObtained, exam.total_marks);

      const [result, created] = await models.ExamResult.upsert({
        exam_id,
        student_id,
        marks_details: subjectMarks,
        total_obtained: totalObtained,
        grade,
        gpa,
        teacher_comment: teacher_comment || null,
      });

      results.push({ student_id, created, total_obtained: totalObtained, grade, gpa });
    }

    return res.json({ message: 'Marks saved successfully', data: results });
  } catch (error) {
    console.error('ExamController.storeMarks error:', error);
    res.status(500).json({ message: 'Failed to save marks' });
  }
};

export const togglePublish = async (req, res) => {
  try {
    const exam = await models.Exam.findByPk(req.params.exam);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    exam.is_published = !exam.is_published;
    await exam.save();

    if (exam.is_published) {
      try {
        const batchIds = await models.Batch.findAll({
          where: { course_id: exam.course_id },
          attributes: ['id'],
        }).then(rows => rows.map(r => r.id));

        if (batchIds.length > 0) {
          const students = await models.Student.findAll({
            where: { current_batch_id: { [Op.in]: batchIds } },
            attributes: ['user_id'],
          });
          await NotificationService.createForStudents({
            userIds: students.map(s => s.user_id),
            type: 'exam',
            title: 'Exam Result Published',
            body: `Your result for "${exam.name}" is now available.`,
            actionUrl: '/student/results',
            actionLabel: 'View Result',
          });
        }
      } catch (notifErr) {
        console.error('Failed to send exam result notification:', notifErr);
      }
    }

    return res.json({ message: `Exam ${exam.is_published ? 'published' : 'unpublished'} successfully`, data: exam });
  } catch (error) {
    console.error('ExamController.togglePublish error:', error);
    return res.status(500).json({ message: 'Failed to toggle publish status' });
  }
};

export const destroy = async (req, res) => {
  try {
    const exam = await models.Exam.findByPk(req.params.exam);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    await models.ExamResult.destroy({ where: { exam_id: exam.id } });
    await exam.destroy();

    return res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('ExamController.destroy error:', error);
    return res.status(500).json({ message: 'Failed to delete exam' });
  }
};

export const myResults = async (req, res) => {
  try {
    const student = await models.Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const results = await models.ExamResult.findAll({
      where: { student_id: student.id },
      include: [
        { model: models.Exam, include: [{ model: models.Course, attributes: ['id', 'title'] }] },
        { model: models.Student, attributes: ['id', 'student_id_card_no'] },
      ],
      order: [[{ model: models.Exam }, 'date', 'DESC']],
    });

    return res.json({ data: results });
  } catch (error) {
    console.error('ExamController.myResults error:', error);
    return res.status(500).json({ message: 'Failed to fetch results' });
  }
};
