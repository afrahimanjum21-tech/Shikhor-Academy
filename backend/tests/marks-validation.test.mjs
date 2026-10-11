import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMark, validateMarksDetails, fullMarksForSubject } from '../services/marksValidation.js';

// I-14 / J — strict mark validation (reject, don't clamp). Pure.

test('validateMark rejects non-numeric, negative, and above-full', () => {
  assert.equal(validateMark('abc', 100).ok, false);
  assert.equal(validateMark(-1, 100).ok, false);
  assert.equal(validateMark(150, 100).ok, false);
  assert.equal(validateMark('', 100).ok, false);
});

test('validateMark accepts a valid in-range number (incl numeric strings)', () => {
  assert.deepEqual(validateMark(50, 100), { ok: true, value: 50 });
  assert.deepEqual(validateMark('72.5', 100), { ok: true, value: 72.5 });
  assert.equal(validateMark(50).ok, true); // no bound given
});

test('fullMarksForSubject: subject_marks > total_marks > default 100', () => {
  assert.equal(fullMarksForSubject({ subject_marks: { Math: 50 } }, 'Math'), 50);
  assert.equal(fullMarksForSubject({ total_marks: 200 }, 'X'), 200);
  assert.equal(fullMarksForSubject({}, 'X'), 100);
});

test('validateMarksDetails skips blanks, rejects bad values, honours allowedSubjects', () => {
  const exam = { subject_marks: { Math: 100, Eng: 100 } };
  assert.deepEqual(validateMarksDetails(exam, { Math: 50, Eng: '' }).clean, { Math: 50 }); // Eng blank skipped
  assert.equal(validateMarksDetails(exam, { Math: 150 }).ok, false);                        // exceeds 100
  assert.deepEqual(
    validateMarksDetails(exam, { Math: 50, Eng: 70 }, new Set(['Math'])).clean,
    { Math: 50 }                                                                             // Eng filtered out
  );
});
