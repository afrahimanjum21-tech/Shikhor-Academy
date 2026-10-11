import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import ExamResultService, { visibleSubjectSet } from '../services/ExamResultService.js';

// §D/I-12/I-13 (denominator) + I-18 (publication-filtered enrichment).

const orig = { examFindAll: models.Exam.findAll, erFindAll: models.ExamResult.findAll };
afterEach(() => { models.Exam.findAll = orig.examFindAll; models.ExamResult.findAll = orig.erFindAll; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

test('I-12/I-13: total_marks null uses per-subject full marks, never /0 or all-F', () => {
  const exam = { subject_marks: { Math: 50, Eng: 50 }, total_marks: null };
  const c = ExamResultService.computeForExam(exam, { Math: 40, Eng: 30 });
  assert.equal(c.full_marks, 100);
  assert.equal(c.percentage, 70);
  assert.equal(c.grade, 'A'); // not F
});

test('computeForExam defaults a subject with no configured full marks to 100', () => {
  const c = ExamResultService.computeForExam({ subject_marks: null, total_marks: null }, { Math: 40 });
  assert.equal(c.full_marks, 100);
  assert.equal(c.percentage, 40);
  assert.equal(c.grade, 'C');
});

test('computeForExam with a visible set only counts those subjects (I-18)', () => {
  const exam = { subject_marks: { Math: 100, Eng: 100 } };
  const c = ExamResultService.computeForExam(exam, { Math: 80, Eng: 20 }, new Set(['Math']));
  assert.equal(c.full_marks, 100);     // only Math counted
  assert.equal(c.total_obtained, 80);
  assert.equal(c.percentage, 80);
});

test('visibleSubjectSet: published=all(null), partial=set, unpublished=empty', () => {
  assert.equal(visibleSubjectSet({ is_published: true }), null);
  assert.deepEqual([...visibleSubjectSet({ is_published: false, published_subjects: ['Math'] })], ['Math']);
  assert.deepEqual([...visibleSubjectSet({ is_published: false })], []);
});

test('enrichResults(restrictToPublished) hides unpublished-subject marks + summary', async () => {
  const exam = { id: 1, is_published: false, published_subjects: ['Math'], subject_marks: { Math: 100, Eng: 100 }, total_marks: 200 };
  const peers = [{ exam_id: 1, student_id: 9, marks_details: { Math: 90, Eng: 10 } }];
  models.Exam.findAll = async () => [exam];
  models.ExamResult.findAll = async () => peers;

  const [out] = await ExamResultService.enrichResults(
    [{ exam_id: 1, student_id: 9, marks_details: { Math: 90, Eng: 10 } }],
    { restrictToPublished: true }
  );

  assert.deepEqual(out.marks_details, { Math: 90 });  // Eng (unpublished) removed
  assert.equal(out.percentage, 90);                    // computed over Math only
  assert.equal(out.grade, 'A+');
});

test('I-4: tied percentages share a position (competition ranking)', async () => {
  const exam = { id: 2, is_published: true, subject_marks: { Math: 100 }, total_marks: 100 };
  const peers = [
    { exam_id: 2, student_id: 1, marks_details: { Math: 90 } }, // tie top
    { exam_id: 2, student_id: 2, marks_details: { Math: 90 } }, // tie top
    { exam_id: 2, student_id: 3, marks_details: { Math: 50 } }, // lower
  ];
  models.Exam.findAll = async () => [exam];
  models.ExamResult.findAll = async () => peers;

  const out = await ExamResultService.enrichResults(peers.map(p => ({ ...p })));
  const pos = Object.fromEntries(out.map(r => [r.student_id, r.position]));
  assert.equal(pos[1], 1);
  assert.equal(pos[2], 1); // tie shares position 1
  assert.equal(pos[3], 3); // competition ranking skips 2
});

