import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPunch, dhakaParts } from '../services/attendanceIngest.js';
import { deviceAuth } from '../middleware/deviceAuth.js';

// Biometric attendance — pure logic (classifyPunch) + device-key auth. No DB.
// Dhaka = UTC+6 (no DST), so a UTC instant maps to a known local time:
//   03:00Z -> 09:00 Dhaka, 03:30Z -> 09:30, 10:00Z -> 16:00, 11:00Z -> 17:00.
const CFG = { morningStart: '09:00', eveningStart: '16:00', graceMin: 15 };

test('classifyPunch: on-time morning punch is present', () => {
  const r = classifyPunch('2026-10-11T03:00:00Z', CFG); // 09:00 Dhaka
  assert.equal(r.date, '2026-10-11');
  assert.equal(r.session, 'morning');
  assert.equal(r.status, 'present');
});

test('classifyPunch: late morning punch is late', () => {
  const r = classifyPunch('2026-10-11T03:30:00Z', CFG); // 09:30 Dhaka > 09:15
  assert.equal(r.session, 'morning');
  assert.equal(r.status, 'late');
});

test('classifyPunch: evening session detected + on-time is present', () => {
  const r = classifyPunch('2026-10-11T10:00:00Z', CFG); // 16:00 Dhaka
  assert.equal(r.session, 'evening');
  assert.equal(r.status, 'present');
  const late = classifyPunch('2026-10-11T11:00:00Z', CFG); // 17:00 Dhaka
  assert.equal(late.status, 'late');
});

test('classifyPunch: date is Dhaka-local (rolls at local midnight)', () => {
  const r = classifyPunch('2026-10-10T20:00:00Z', CFG); // 02:00 Dhaka next day
  assert.equal(r.date, '2026-10-11');
  assert.equal(r.session, 'morning');
});

test('classifyPunch: invalid timestamp returns null', () => {
  assert.equal(classifyPunch('not-a-date', CFG), null);
  assert.equal(dhakaParts('nope'), null);
});

// --- device-key auth ---
function mk() {
  return { _s: 200, _j: undefined, status(c) { this._s = c; return this; }, json(p) { this._j = p; return this; } };
}

test('deviceAuth: DISABLED (503) when no key is configured', () => {
  const prev = process.env.ATTENDANCE_DEVICE_KEY;
  delete process.env.ATTENDANCE_DEVICE_KEY;
  const res = mk(); let nexted = false;
  deviceAuth({ headers: {} }, res, () => { nexted = true; });
  assert.equal(res._s, 503);
  assert.equal(nexted, false);
  if (prev !== undefined) process.env.ATTENDANCE_DEVICE_KEY = prev;
});

test('deviceAuth: 401 on a wrong/missing key, passes on the right key', () => {
  const prev = process.env.ATTENDANCE_DEVICE_KEY;
  process.env.ATTENDANCE_DEVICE_KEY = 'secret-key-123';

  let res = mk(); let nexted = false;
  deviceAuth({ headers: {} }, res, () => { nexted = true; });
  assert.equal(res._s, 401); assert.equal(nexted, false);

  res = mk(); nexted = false;
  deviceAuth({ headers: { 'x-device-key': 'wrong' } }, res, () => { nexted = true; });
  assert.equal(res._s, 401); assert.equal(nexted, false);

  res = mk(); nexted = false;
  deviceAuth({ headers: { 'x-device-key': 'secret-key-123' } }, res, () => { nexted = true; });
  assert.equal(nexted, true);

  if (prev === undefined) delete process.env.ATTENDANCE_DEVICE_KEY; else process.env.ATTENDANCE_DEVICE_KEY = prev;
});
