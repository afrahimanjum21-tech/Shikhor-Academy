import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import models, { sequelize } from '../models/index.js';
import { saveMarks } from '../controllers/Teacher/TeacherMarksController.js';

/**
 * Regression tests for the authorization hardening of the legacy teacher
 * marks endpoint (POST /teacher/exams/marks -> TeacherMarksController.saveMarks).
 *
 * Before: it only checked a COURSE-level assignment, then wrote the whole
 * marks_details object for any student in the course — so a teacher could
 * overwrite subjects they do not teach and students in batches they are not
 * assigned to, clobbering marks entered via /teacher/results/marks.
 *
 * After: it scopes to the teacher's assigned batches + subjects (same model as
 * TeacherResultController) and merges only allowed subjects. The model layer is
 * stubbed — NO database connection is made.
 */

const O = {
  examFindByPk: models.Exam.findByPk,
  batchFindAll: models.Batch.findAll,
  tbaFindAll: models.TeacherBatchAssignment.findAll,
  studentFindAll: models.Student.findAll,
  erFindOrCreate: models.ExamResult.findOrCreate,
  erFindAll: models.ExamResult.findAll,
};

let store;
function install(fx) {
  store = { ...fx, updates: [] };
  models.Exam.findByPk = async (id) => (store.exam && store.exam.id === Number(id) ? store.exam : null);
  models.Batch.findAll = async ({ where }) => store.batches.filter(b => b.course_id === where.course_id).map(b => ({ id: b.id }));
  models.TeacherBatchAssignment.findAll = async ({ where }) => {
    const ids = where.batch_id[Op.in];
    return store.assignments.filter(a => a.teacher_id === where.teacher_id && ids.includes(a.batch_id)).map(a => ({ batch_id: a.batch_id, subject: a.subject }));
  };
  models.Student.findAll = async ({ where }) => {
    const ids = where.id[Op.in];
    const batchIds = where.current_batch_id[Op.in];
    return store.students.filter(s => ids.includes(s.id) && batchIds.includes(s.current_batch_id)).map(s => ({ id: s.id }));
  };
  models.ExamResult.findOrCreate = async ({ where, defaults }) => {
    const sid = where.student_id;
    if (!store.results[sid]) store.results[sid] = { marks_details: { ...(defaults.marks_details || {}) }, teacher_id: null, teacher_comment: null };
    const row = store.results[sid];
    return [{
      marks_details: row.marks_details,
      teacher_comment: row.teacher_comment,
      update: async (vals) => { Object.assign(row, vals); store.updates.push({ sid, vals }); return row; },
    }];
  };
  // recomputeExam() reads every result row for the exam and re-persists the
  // canonical grade/gpa/position; back it with the same in-memory store.
  models.ExamResult.findAll = async () => Object.entries(store.results).map(([sid, row]) => ({
    student_id: Number(sid),
    marks_details: row.marks_details,
    update: async (vals) => { Object.assign(row, vals); return row; },
  }));
}

afterEach(() => { Object.assign(models.Exam, { findByPk: O.examFindByPk }); models.Batch.findAll = O.batchFindAll; models.TeacherBatchAssignment.findAll = O.tbaFindAll; models.Student.findAll = O.studentFindAll; models.ExamResult.findOrCreate = O.erFindOrCreate; models.ExamResult.findAll = O.erFindAll; });
after(async () => { try { await sequelize.close(); } catch { /* no connection opened */ } });

const baseFixtures = () => ({
  exam: { id: 100, course_id: 1, total_marks: 100, subjects: ['Physics', 'Chemistry'] },
  batches: [{ id: 1, course_id: 1 }, { id: 2, course_id: 1 }],
  assignments: [{ teacher_id: 7, batch_id: 1, subject: 'Physics' }],
  students: [{ id: 11, current_batch_id: 1 }, { id: 12, current_batch_id: 2 }],
  results: { 11: { marks_details: { Chemistry: 50 }, teacher_id: 99, teacher_comment: null } },
});
const req = (body) => ({ user: { id: 7 }, body });
const makeRes = () => ({ statusCode: 200, body: undefined, status(c){this.statusCode=c; return this;}, json(p){this.body=p; return this;} });

test('writes only the assigned subject, preserves another teacher\'s subject, sets teacher_id', async () => {
  install(baseFixtures());
  const res = makeRes();
  await saveMarks(req({ exam_id: 100, marks: [{ student_id: 11, marks_details: { Physics: 80, Chemistry: 99 } }] }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 1);
  const row = store.results[11];
  assert.equal(row.marks_details.Physics, 80, 'assigned subject written');
  assert.equal(row.marks_details.Chemistry, 50, 'unassigned subject NOT overwritten (preserved from the other teacher)');
  assert.equal(row.teacher_id, 7, 'teacher_id attribution recorded');
});

test('rejects marking a student in a batch the teacher is NOT assigned to (400)', async () => {
  install(baseFixtures());
  const res = makeRes();
  await saveMarks(req({ exam_id: 100, marks: [{ student_id: 12, marks_details: { Physics: 70 } }] }), res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /not in a batch you are assigned/i);
});

test('rejects a teacher with no assignment in the exam\'s course (403)', async () => {
  const fx = baseFixtures(); fx.assignments = [];
  install(fx);
  const res = makeRes();
  await saveMarks(req({ exam_id: 100, marks: [{ student_id: 11, marks_details: { Physics: 80 } }] }), res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /not assigned to this exam's course/i);
});

test('rejects when the teacher\'s subject is not part of the exam (403)', async () => {
  const fx = baseFixtures(); fx.assignments = [{ teacher_id: 7, batch_id: 1, subject: 'History' }];
  install(fx);
  const res = makeRes();
  await saveMarks(req({ exam_id: 100, marks: [{ student_id: 11, marks_details: { History: 80 } }] }), res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /not assigned to teach any subject/i);
});

test('a teacher assigned both subjects may write both', async () => {
  const fx = baseFixtures();
  fx.assignments = [{ teacher_id: 7, batch_id: 1, subject: 'Physics' }, { teacher_id: 7, batch_id: 1, subject: 'Chemistry' }];
  fx.results = { 11: { marks_details: {}, teacher_id: null, teacher_comment: null } };
  install(fx);
  const res = makeRes();
  await saveMarks(req({ exam_id: 100, marks: [{ student_id: 11, marks_details: { Physics: 60, Chemistry: 70 } }] }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(store.results[11].marks_details.Physics, 60);
  assert.equal(store.results[11].marks_details.Chemistry, 70);
});
