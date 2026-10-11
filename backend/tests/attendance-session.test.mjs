import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSession, todayLocalDate, dhakaTime } from '../services/attendanceSession.js';

// C3 — one consistent, NON-NULL session resolver for admin + teacher. Pure.

test('resolveSession honours an explicit morning/evening', () => {
  assert.equal(resolveSession('morning'), 'morning');
  assert.equal(resolveSession('evening'), 'evening');
});

test('resolveSession never returns null for missing/invalid input', () => {
  for (const input of [undefined, null, '', 'garbage', 'MORNING', 0]) {
    const s = resolveSession(input);
    assert.ok(s === 'morning' || s === 'evening', `got ${s} for ${String(input)}`);
  }
});

test('todayLocalDate is YYYY-MM-DD and dhakaTime is HH:MM:SS', () => {
  assert.match(todayLocalDate(), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(dhakaTime(), /^\d{2}:\d{2}:\d{2}$/);
});
