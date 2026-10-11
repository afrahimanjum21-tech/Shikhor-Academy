import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import NotificationService from '../services/NotificationService.js';
import { gradeSubmission } from '../controllers/Teacher/TeacherAssignmentController.js';
import { submit } from '../controllers/Student/StudentAssignmentController.js';

// J (grade validation) + K (assignment lateness).

const orig = {
  subFindByPk: models.AssignmentSubmission.findByPk,
  subFindOne: models.AssignmentSubmission.findOne,
  subCreate: models.AssignmentSubmission.create,
  studentFindOne: models.Student.findOne,
  studentFindByPk: models.Student.findByPk,
  asgFindByPk: models.Assignment.findByPk,
  notify: NotificationService.create,
};
afterEach(() => {
  models.AssignmentSubmission.findByPk = orig.subFindByPk;
  models.AssignmentSubmission.findOne = orig.subFindOne;
  models.AssignmentSubmission.create = orig.subCreate;
  models.Student.findOne = orig.studentFindOne;
  models.Student.findByPk = orig.studentFindByPk;
  models.Assignment.findByPk = orig.asgFindByPk;
  NotificationService.create = orig.notify;
});
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const makeRes = () => ({ statusCode: 200, body: undefined, status(c) { this.statusCode = c; return this; }, json(p) { this.body = p; return this; } });

const stubSubmission = () => {
  const row = { marks_obtained: null, feedback: null, status: 'submitted', Assignment: { total_marks: 100 }, student_id: 3, save: async () => row };
  models.AssignmentSubmission.findByPk = async () => row;
  NotificationService.create = async () => ({});
  models.Student.findByPk = async () => ({ user_id: 9 });
  return row;
};

test('J: gradeSubmission rejects above-full / negative / non-numeric marks', async () => {
  for (const bad of [150, -5, 'abc']) {
    const row = stubSubmission();
    const res = makeRes();
    await gradeSubmission({ user: { id: 7 }, params: { submissionId: 1 }, body: { marks_obtained: bad } }, res);
    assert.equal(res.statusCode, 400, `expected 400 for ${bad}`);
    assert.equal(row.status, 'submitted'); // never persisted graded
  }
});

test('J: gradeSubmission accepts a valid in-range mark', async () => {
  const row = stubSubmission();
  const res = makeRes();
  await gradeSubmission({ user: { id: 7 }, params: { submissionId: 1 }, body: { marks_obtained: 80, feedback: 'good' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(row.marks_obtained, 80);
  assert.equal(row.status, 'graded');
});

test('K: a submission after the due date is recorded as late', async () => {
  models.Student.findOne = async () => ({ id: 3, current_batch_id: 5 });
  models.Assignment.findByPk = async () => ({ id: 1, batch_id: 5, due_date: '2020-01-01' });
  models.AssignmentSubmission.findOne = async () => null;
  let created;
  models.AssignmentSubmission.create = async (v) => { created = v; return { toJSON: () => ({ id: 1, ...v }) }; };

  const res = makeRes();
  await submit({ user: { id: 9 }, params: { assignmentId: 1 }, body: { submission_text: 'done' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(created.status, 'late');
  assert.equal(res.body.data.is_late, true);
});

test('K: an on-time submission is not marked late', async () => {
  models.Student.findOne = async () => ({ id: 3, current_batch_id: 5 });
  models.Assignment.findByPk = async () => ({ id: 1, batch_id: 5, due_date: '2099-01-01' });
  models.AssignmentSubmission.findOne = async () => null;
  let created;
  models.AssignmentSubmission.create = async (v) => { created = v; return { toJSON: () => ({ id: 1, ...v }) }; };

  const res = makeRes();
  await submit({ user: { id: 9 }, params: { assignmentId: 1 }, body: { submission_text: 'done' } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(created.status, 'submitted');
  assert.equal(res.body.data.is_late, false);
});
