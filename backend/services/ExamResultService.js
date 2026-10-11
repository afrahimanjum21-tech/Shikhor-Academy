import models from '../models/index.js';
import { Op } from 'sequelize';
import GradeService from './GradeService.js';

const fullMarksFor = (subjectMarks, subject) => {
  const value = parseFloat(subjectMarks?.[subject]);
  return Number.isFinite(value) && value > 0 ? value : 100;
};

// The set of subjects a STUDENT may see for an exam, or null meaning "all".
// A fully-published exam (is_published) shows every subject; a partially
// published exam shows only published_subjects; an unpublished exam shows none.
export const visibleSubjectSet = (exam) => {
  if (exam?.is_published) return null; // all subjects visible
  const pub = Array.isArray(exam?.published_subjects) ? exam.published_subjects : [];
  return new Set(pub);
};

// Percentage, grade and GPA are always computed over the subjects the student
// actually has marks for (full marks per subject from exam.subject_marks,
// defaulting to 100). Using exam.total_marks as the denominator is wrong when
// marks are entered subject by subject. `visible` (a Set or null) optionally
// restricts the computation to published subjects (I-18) — null = all subjects.
const computeForExam = (exam, marksDetails, visible = null) => {
  const marks = marksDetails && typeof marksDetails === 'object' && !Array.isArray(marksDetails)
    ? marksDetails
    : {};
  const subjectMarks = exam?.subject_marks && typeof exam.subject_marks === 'object' && !Array.isArray(exam.subject_marks)
    ? exam.subject_marks
    : {};

  let obtained = 0;
  let full = 0;
  for (const [subject, value] of Object.entries(marks)) {
    if (visible && !visible.has(subject)) continue;
    const v = parseFloat(value);
    if (!Number.isFinite(v)) continue;
    obtained += v;
    full += fullMarksFor(subjectMarks, subject);
  }

  const percentage = full > 0 ? (obtained / full) * 100 : 0;
  const calc = GradeService.calculate(obtained, full || exam?.total_marks || 0);
  return {
    total_obtained: Math.round(obtained * 100) / 100,
    full_marks: full,
    percentage: Math.round(percentage * 100) / 100,
    grade: calc.grade,
    gpa: calc.gpa,
    status: calc.status,
  };
};

// Competition ranking (ties share the same position) over students who have
// marks for at least one subject. Persists total_obtained/grade/gpa/position
// for every student of the exam. Persisted values are the FULL-exam grade (not
// publication-filtered) — publication visibility is a read-time concern.
const recomputeExam = async (exam, options = {}) => {
  const { transaction } = options;
  const rows = await models.ExamResult.findAll({ where: { exam_id: exam.id }, transaction });
  const computed = rows.map(row => ({ row, calc: computeForExam(exam, row.marks_details) }));
  const ranked = computed
    .filter(c => c.calc.full_marks > 0)
    .sort((a, b) => b.calc.percentage - a.calc.percentage);

  const positionByStudent = new Map();
  ranked.forEach((c, i) => {
    const pos = i > 0 && c.calc.percentage === ranked[i - 1].calc.percentage
      ? positionByStudent.get(ranked[i - 1].row.student_id)
      : i + 1;
    positionByStudent.set(c.row.student_id, pos);
  });

  await Promise.all(computed.map(c => c.row.update({
    total_obtained: c.calc.total_obtained,
    grade: c.calc.grade,
    gpa: c.calc.gpa,
    position: positionByStudent.get(c.row.student_id) || null,
  }, { transaction })));

  return computed.map(c => ({
    student_id: c.row.student_id,
    ...c.calc,
    position: positionByStudent.get(c.row.student_id) || null,
  }));
};

// Enrich result objects (model instances or plain toJSON) with freshly
// computed total_obtained/grade/gpa/percentage/position without writing to the
// DB. Used by the student-facing endpoints so rows saved before this logic
// existed still render correct values.
//
// `restrictToPublished` (I-18): when true, each exam's computation, ranking AND
// returned marks_details are limited to the subjects a student may see
// (published_subjects for a partial publish; all for a fully-published exam).
// Admin/teacher views pass false (default) to see the full, unfiltered result.
const enrichResults = async (results, { restrictToPublished = false } = {}) => {
  const examIds = [...new Set(results.map(r => r.exam_id).filter(Boolean))];
  if (!examIds.length) return results;

  const [exams, peers] = await Promise.all([
    models.Exam.findAll({ where: { id: { [Op.in]: examIds } } }),
    models.ExamResult.findAll({ where: { exam_id: { [Op.in]: examIds } } }),
  ]);

  const examMap = new Map(exams.map(e => [e.id, e]));
  const visibleMap = new Map(exams.map(e => [e.id, restrictToPublished ? visibleSubjectSet(e) : null]));
  const positionMap = new Map();

  for (const exam of exams) {
    const visible = visibleMap.get(exam.id);
    const computed = peers
      .filter(p => p.exam_id === exam.id)
      .map(p => ({ student_id: p.student_id, calc: computeForExam(exam, p.marks_details, visible) }));
    const ranked = computed
      .filter(c => c.calc.full_marks > 0)
      .sort((a, b) => b.calc.percentage - a.calc.percentage);
    ranked.forEach((c, i) => {
      const pos = i > 0 && c.calc.percentage === ranked[i - 1].calc.percentage
        ? positionMap.get(`${exam.id}:${ranked[i - 1].student_id}`)
        : i + 1;
      positionMap.set(`${exam.id}:${c.student_id}`, pos);
    });
  }

  return results.map(r => {
    const exam = examMap.get(r.exam_id);
    const visible = visibleMap.get(r.exam_id);
    const calc = exam ? computeForExam(exam, r.marks_details, visible) : null;
    const data = r.toJSON ? r.toJSON() : r;
    // Never hand a student marks for a subject they may not see yet (I-18).
    if (visible && data.marks_details && typeof data.marks_details === 'object' && !Array.isArray(data.marks_details)) {
      data.marks_details = Object.fromEntries(
        Object.entries(data.marks_details).filter(([subject]) => visible.has(subject))
      );
    }
    return {
      ...data,
      ...(calc ? {
        total_obtained: calc.total_obtained,
        grade: calc.grade,
        gpa: calc.gpa,
        percentage: calc.percentage,
      } : {}),
      position: positionMap.get(`${r.exam_id}:${r.student_id}`) || null,
    };
  });
};


const ExamResultService = { computeForExam, recomputeExam, enrichResults };
export default ExamResultService;
