import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalMonthKey, displayMonth, isValidMonthInput, todayDhaka } from '../services/paymentMonth.js';

// B3 + §D — one canonical month key; Asia/Dhaka date helper. Pure, no DB.

test('canonicalMonthKey normalizes YYYY-MM, Mon YYYY, Month YYYY, YYYY-MM-DD to one key', () => {
  assert.equal(canonicalMonthKey('2026-08'), 'Aug 2026');
  assert.equal(canonicalMonthKey('Aug 2026'), 'Aug 2026');
  assert.equal(canonicalMonthKey('aug 2026'), 'Aug 2026');
  assert.equal(canonicalMonthKey('August 2026'), 'Aug 2026');
  assert.equal(canonicalMonthKey('2026-08-15'), 'Aug 2026');
});

test('legacy and canonical forms map to the SAME key (the B3 bug)', () => {
  assert.equal(canonicalMonthKey('2026-08'), canonicalMonthKey('Aug 2026'));
});

test('canonicalMonthKey rejects unparseable / out-of-range input', () => {
  assert.equal(canonicalMonthKey('not-a-month'), null);
  assert.equal(canonicalMonthKey('2026-13'), null);
  assert.equal(canonicalMonthKey(''), null);
  assert.equal(canonicalMonthKey(null), null);
});

test('displayMonth + isValidMonthInput', () => {
  assert.equal(displayMonth('2026-01'), 'Jan 2026');
  assert.equal(isValidMonthInput('2026-08'), true);
  assert.equal(isValidMonthInput('Aug 2026'), true);
  assert.equal(isValidMonthInput('xyz'), false);
});

test('todayDhaka returns a YYYY-MM-DD string', () => {
  assert.match(todayDhaka(), /^\d{4}-\d{2}-\d{2}$/);
});
