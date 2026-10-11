import models, { sequelize } from '../../models/index.js';
import GradeService from '../../services/GradeService.js';
import ExamResultService from '../../services/ExamResultService.js';
import { validateMarksDetails } from '../../services/marksValidation.js';
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

    const batches = await models.Batch.findAll({ where: { course_id: exam.course_id }, attributes: ['id'] });
    const batchIds = batches.map(b => b.id);

    const students = batchIds.length
      ? await models.Student.findAll({
          where: { current_batch_id: { [Op.in]: batchIds } },
          include: [{ model: models.User, attributes: ['id', 'name', 'email', 'phone'] }],
          attributes: ['id', 'user_id', 'student_id_card_no', 'current_batch_id'],
        })
      : [];

    const studentsJson = students.map(s => {
      const json = s.toJSON();
      json.user = json.User || null;
      delete json.User;
      return json;
    });

    const results = await models.ExamResult.findAll({
      where: { exam_id: id },
      include: [{ model: models.Student, include: [{ model: models.User, attributes: ['name', 'email'] }] }],
    });

    return res.json({ data: { ...exam.toJSON(), students: studentsJson, results } });
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

    // (B) Every student must belong to a batch of the exam's course before we
    // accept any marks — a client must not post marks for arbitrary students.
    const batchIds = await models.Batch.findAll({
      where: { course_id: exam.course_id }, attributes: ['id'],
    }).then(rows => rows.map(r => r.id));
    const studentIds = [...new Set(entries.map(e => e.student_id))];
    const validStudents = batchIds.length
      ? await models.Student.findAll({
          where: { id: { [Op.in]: studentIds }, current_batch_id: { [Op.in]: batchIds } },
          attributes: ['id'],
        })
      : [];
    if (validStudents.length !== studentIds.length) {
      return res.status(400).json({ message: 'Some students do not belong to this exam\'s course' });
    }

    // (I-14) Validate every mark up front; reject the WHOLE batch on any bad
    // value so nothing invalid is persisted.
    const prepared = [];
    for (const entry of entries) {
      const subjectMarks = entry.details || entry.marks_details || {};
      const check = validateMarksDetails(exam, subjectMarks);
      if (!check.ok) {
        return res.status(400).json({ message: `Student ${entry.student_id}: ${check.reason}` });
      }
      prepared.push({ student_id: entry.student_id, marks_details: check.clean, teacher_comment: entry.teacher_comment || null });
    }

    // (B) Save the batch transactionally — a mid-batch failure rolls back every
    // row, never a partial save.
    await sequelize.transaction(async (t) => {
      for (const p of prepared) {
        const calc = ExamResultService.computeForExam(exam, p.marks_details);
        await models.ExamResult.upsert({
          exam_id,
          student_id: p.student_id,
          marks_details: p.marks_details,
          total_obtained: calc.total_obtained,
          grade: calc.grade,
          gpa: calc.gpa,
          teacher_comment: p.teacher_comment,
        }, { transaction: t });
      }
      // Rank + persist canonical grade/gpa/position for every student (I-4).
      await ExamResultService.recomputeExam(exam, { transaction: t });
    });

    const results = prepared.map(p => {
      const calc = ExamResultService.computeForExam(exam, p.marks_details);
      return { student_id: p.student_id, total_obtained: calc.total_obtained, grade: calc.grade, gpa: calc.gpa };
    });

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
    if (exam.is_published) {
      exam.published_subjects = exam.subjects || [];
    } else {
      // E4: unpublishing must REVOKE visibility. myResults treats a non-empty
      // published_subjects as "partially published / visible", so a stale list
      // would keep the result on the student page after an unpublish. Clear it
      // (marks/data are untouched).
      exam.published_subjects = [];
    }
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

    // Teachers publish results subject by subject, so a result only becomes
    // visible once at least one subject (or the whole exam) is published.
    // Normalize aliases to lowercase so consumers can read result.exam.
    const visibleResults = results
      .filter(result =>
        result.Exam?.is_published || (result.Exam?.published_subjects || []).length > 0
      )
      .map(result => {
        const data = result.toJSON();
        data.exam = data.Exam || null;
        if (data.exam?.Course) {
          data.exam.course = data.exam.Course;
          delete data.exam.Course;
        }
        delete data.Exam;
        data.student = data.Student || null;
        delete data.Student;
        return data;
      });

    // Recompute percentage/grade/gpa/position so rows saved before positions
    // were computed (or graded on the full exam total) still render correctly.
    // restrictToPublished (I-18): hide unpublished-subject marks AND compute the
    // summary/rank only over the subjects this student may see.
    const enriched = await ExamResultService.enrichResults(visibleResults, { restrictToPublished: true });

    return res.json({ data: enriched });
  } catch (error) {
    console.error('ExamController.myResults error:', error);
    return res.status(500).json({ message: 'Failed to fetch results' });
  }
};
