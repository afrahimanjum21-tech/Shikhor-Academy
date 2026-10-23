import test from 'node:test';
import assert from 'node:assert/strict';
import { batchCourseId, batchCourseTitle, withoutStudentWhatsAppLink } from './attendanceState.js';

test('removes only the selected student stale WhatsApp link', () => {
  const links = { 101: 'https://wa.me/8801700000000?text=old', 104: 'https://wa.me/8801700000001?text=keep' };
  const next = withoutStudentWhatsAppLink(links, 101);
  assert.deepEqual(next, { 104: links[104] });
  assert.equal(links[101], 'https://wa.me/8801700000000?text=old');
});

test('returns the same object when the student has no prepared link', () => {
  const links = { 104: 'https://wa.me/8801700000001?text=keep' };
  assert.equal(withoutStudentWhatsAppLink(links, 101), links);
});

test('reads class/batch labels from admin, teacher, and daily-sheet shapes', () => {
  assert.equal(batchCourseId({ course_id: 1, Course: { id: 2 } }), 1);
  assert.equal(batchCourseId({ course: { id: 3 } }), 3);
  assert.equal(batchCourseId({ Course: { id: 4 } }), 4);
  assert.equal(batchCourseId(undefined), null);

  assert.equal(batchCourseTitle({ course_title: 'Class 9' }), 'Class 9');
  assert.equal(batchCourseTitle({ course: { title: 'Class 10' } }), 'Class 10');
  assert.equal(batchCourseTitle({ Course: { title: 'Class 11' } }), 'Class 11');
  assert.equal(batchCourseTitle(undefined), null);
});
