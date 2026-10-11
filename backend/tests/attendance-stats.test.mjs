import test from 'node:test';
import assert from 'node:assert/strict';
import { attendanceSummary } from '../services/attendanceStats.js';

// I-19 — eligible days = present + absent + late + approved leave; pending and
// rejected leave are excluded from the denominator. Pure.

test('eligible days sum the four counted categories; percentage = present/eligible', () => {
  const s = attendanceSummary({ present: 8, absent: 1, late: 1, approvedLeave: 0 });
  assert.equal(s.eligibleDays, 10);
  assert.equal(s.percentage, 80);
});

test('approved leave counts as an eligible day but not as present', () => {
  const s = attendanceSummary({ present: 5, absent: 0, late: 0, approvedLeave: 5 });
  assert.equal(s.eligibleDays, 10);
  assert.equal(s.percentage, 50); // present/eligible = 5/10
});

test('pending/rejected leave are excluded by construction (never passed in)', () => {
  // The caller counts ONLY approved leave; pending/rejected are simply not
  // included, so a student with 9 present + 1 pending-leave day is 100%.
  const s = attendanceSummary({ present: 9, absent: 0, late: 0, approvedLeave: 0 });
  assert.equal(s.eligibleDays, 9);
  assert.equal(s.percentage, 100);
});

test('no eligible days => 0% (no divide-by-zero)', () => {
  const s = attendanceSummary({});
  assert.equal(s.eligibleDays, 0);
  assert.equal(s.percentage, 0);
});
