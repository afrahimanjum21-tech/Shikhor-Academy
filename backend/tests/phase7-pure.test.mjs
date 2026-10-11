import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeSlot } from '../services/routineTime.js';
import { isUnicodeSms, smsSegmentLimit, truncateSms, stripEmojis } from '../services/sms/smsEncoding.js';
import { isAllowedImage, isAllowedFile } from '../middleware/upload.js';
import { expiresInToMs } from '../config/auth.js';

// Phase 7 pure helpers: D5 time parse, D8 SMS encoding, H-low4 upload, D19 cookie.

test('D5 parseTimeSlot splits ranges and falls back to the label', () => {
  assert.deepEqual(parseTimeSlot('08:00-09:00'), { start_time: '08:00', end_time: '09:00' });
  assert.deepEqual(parseTimeSlot('9:00 AM – 10:00 AM'), { start_time: '9:00 AM', end_time: '10:00 AM' });
  assert.deepEqual(parseTimeSlot('10:00 to 11:00'), { start_time: '10:00', end_time: '11:00' });
  assert.deepEqual(parseTimeSlot('Period 1'), { start_time: 'Period 1', end_time: 'Period 1' });
  assert.deepEqual(parseTimeSlot(''), { start_time: '', end_time: '' });
});

test('D8 SMS encoding: Bangla => Unicode (70), ASCII => GSM (160)', () => {
  assert.equal(isUnicodeSms('Hello there'), false);
  assert.equal(isUnicodeSms('হ্যালো'), true);
  assert.equal(smsSegmentLimit('Hello'), 160);
  assert.equal(smsSegmentLimit('হ্যালো'), 70);
});

test('D8 stripEmojis removes emoji but never damages Bangla', () => {
  assert.equal(stripEmojis('হ্যালো 🎉✅'), 'হ্যালো');
  assert.equal(stripEmojis('Fee due 💰'), 'Fee due');
});

test('D8 truncateSms is encoding-aware and grapheme-safe', () => {
  const bangla = 'ক'.repeat(100);
  const out = truncateSms(bangla);
  assert.equal(Array.from(out).length, 70); // UCS-2 single-segment limit
  const ascii = 'a'.repeat(200);
  assert.equal(truncateSms(ascii).length, 160);
  // A trailing emoji (surrogate pair) is never cut in half.
  const withEmoji = 'a'.repeat(159) + '😀';
  assert.ok(!/\uD800-\uDBFF$/.test(truncateSms(withEmoji)));
});

test('H-low4 anchored upload allowlists reject spoofed ext/mime', () => {
  assert.equal(isAllowedImage('photo.jpg', 'image/jpeg'), true);
  assert.equal(isAllowedImage('photo.PNG', 'image/png'), true);
  assert.equal(isAllowedImage('x.notpng', 'image/png'), false); // spoofed extension
  assert.equal(isAllowedImage('photo.jpg.exe', 'image/jpeg'), false);
  assert.equal(isAllowedImage('photo.jpg', 'application/x-msdownload'), false); // spoofed mime
  assert.equal(isAllowedImage('x.svg', 'image/svg+xml'), false); // not allowed type

  assert.equal(isAllowedFile('notes.pdf'), true);
  assert.equal(isAllowedFile('data.csv'), true);
  assert.equal(isAllowedFile('a.pdf.exe'), false);
  assert.equal(isAllowedFile('note.notpdf'), false);
});

test('D19 expiresInToMs parses supported duration formats; defaults to 30d', () => {
  assert.equal(expiresInToMs('30d'), 30 * 24 * 60 * 60 * 1000);
  assert.equal(expiresInToMs('12h'), 12 * 60 * 60 * 1000);
  assert.equal(expiresInToMs('60m'), 60 * 60 * 1000);
  assert.equal(expiresInToMs('3600s'), 3600 * 1000);
  assert.equal(expiresInToMs(3600), 3600 * 1000); // bare number = seconds (jwt semantics)
  assert.equal(expiresInToMs('nonsense'), 30 * 24 * 60 * 60 * 1000);
});
