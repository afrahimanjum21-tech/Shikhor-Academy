import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWhatsAppNumber,
  maskWhatsAppNumber,
  resolveGuardianPhone,
  formatAttendanceDate,
  buildClassBatchLabel,
  buildAttendanceMessage,
  buildWhatsAppUrl,
} from '../services/attendance/WhatsAppNotification.js';

test('normalizes Bangladeshi domestic and international guardian numbers', () => {
  assert.equal(normalizeWhatsAppNumber('01712345678'), '8801712345678');
  assert.equal(normalizeWhatsAppNumber('017 1234-5678'), '8801712345678');
  assert.equal(normalizeWhatsAppNumber('+880 1712345678'), '8801712345678');
  assert.equal(normalizeWhatsAppNumber('00880 1712345678'), '8801712345678');
  assert.equal(normalizeWhatsAppNumber('8801712345678'), '8801712345678');
  assert.equal(normalizeWhatsAppNumber('1712345678'), '8801712345678');
});

test('does not blindly prefix 880 to non-Bangladeshi international numbers', () => {
  assert.equal(normalizeWhatsAppNumber('+44 20 7946 0958'), '442079460958');
  assert.equal(normalizeWhatsAppNumber('+1 202 555 0147'), '12025550147');
  assert.equal(normalizeWhatsAppNumber('00971501234567'), '971501234567');
});

test('rejects missing, malformed, already-double-prefixed, and ambiguous local numbers', () => {
  for (const value of ['', '   ', null, undefined, 'abc', '01712', '+880 01712345678', '88001712345678', '01234567890']) {
    assert.equal(normalizeWhatsAppNumber(value), null, `expected ${String(value)} to be rejected`);
  }
});

test('masks the guardian number without exposing all digits', () => {
  const masked = maskWhatsAppNumber('01712345678');
  assert.equal(masked, '+880 •••• 5678');
  assert.ok(!masked.includes('171234'));
  assert.equal(maskWhatsAppNumber('+44 20 7946 0958'), '+44 •••• 0958');
});

test('reuses guardian_phone first and older parent fields as safe fallbacks', () => {
  assert.deepEqual(
    resolveGuardianPhone({ guardian_phone: '01712345678', father_phone: '01812345678', mother_phone: '01912345678' }),
    { number: '8801712345678', field: 'guardian_phone', label: 'Guardian' },
  );
  assert.deepEqual(
    resolveGuardianPhone({ guardian_phone: '', father_phone: '01812345678', mother_phone: '01912345678' }),
    { number: '8801812345678', field: 'father_phone', label: 'Father' },
  );
  assert.deepEqual(
    resolveGuardianPhone({ guardian_phone: null, father_phone: 'invalid', mother_phone: '01912345678' }),
    { number: '8801912345678', field: 'mother_phone', label: 'Mother' },
  );
  assert.equal(resolveGuardianPhone({}), null);
});

test('formats dates without timezone drift and builds a stable class/batch label', () => {
  assert.equal(formatAttendanceDate('2026-10-23'), '23 October 2026');
  assert.equal(formatAttendanceDate('2026-02-30'), '2026-02-30');
  assert.equal(buildClassBatchLabel({ courseTitle: 'Class 9', batchName: 'Batch A' }), 'Class 9 — Batch A');
  assert.equal(buildClassBatchLabel({ courseTitle: 'Class 9' }), 'Class 9');
  assert.equal(buildClassBatchLabel({}), 'Shikhar Academy');
});

test('builds the Present bilingual template with every required value', () => {
  const message = buildAttendanceMessage({
    studentName: 'Ayesha Rahman',
    courseTitle: 'Class 9',
    batchName: 'Batch A',
    date: '2026-10-23',
    status: 'present',
  });

  assert.match(message, /প্রিয় অভিভাবক/);
  assert.match(message, /উপস্থিত হিসেবে চিহ্নিত হয়েছে/);
  assert.match(message, /আপনার সন্তান Ayesha Rahman আজ 23 October 2026 তারিখে/);
  assert.match(message, /Class 9 — Batch A/);
  assert.match(message, /marked PRESENT/);
  assert.match(message, /Shikhar Academy on 23 October 2026/);
  assert.match(message, /শিখর একাডেমি — Shikhar Academy/);
  assert.doesNotMatch(message, /undefined|null|Uttoron/i);
});

test('builds the Absent bilingual template with the correct status', () => {
  const message = buildAttendanceMessage({
    studentName: 'Rafi',
    courseTitle: 'HSC',
    batchName: 'Evening',
    date: '2026-11-01',
    status: 'absent',
  });

  assert.match(message, /অনুপস্থিত হিসেবে চিহ্নিত হয়েছে/);
  assert.match(message, /marked ABSENT/);
  assert.match(message, /HSC — Evening/);
  assert.doesNotMatch(message, /marked PRESENT/);
});

test('rejects unsupported manual notification statuses', () => {
  assert.throws(
    () => buildAttendanceMessage({ studentName: 'A', date: '2026-10-23', status: 'late' }),
    /present or absent/,
  );
});

test('URL-encodes Bengali text and line breaks while retaining the exact message', () => {
  const message = buildAttendanceMessage({
    studentName: 'Ayesha রহমান',
    courseTitle: 'Class 9',
    batchName: 'Batch A',
    date: '2026-10-23',
    status: 'present',
  });
  const url = buildWhatsAppUrl({ phone: '01712345678', message });

  assert.ok(url.startsWith('https://wa.me/8801712345678?text='));
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('text'), message);
  assert.match(url, /%E0%A6/); // Bengali Unicode was encoded
  assert.match(url, /%0A/);    // line breaks survived encoding
  assert.doesNotMatch(url, /Uttoron/i);
});

test('returns no WhatsApp URL when the guardian number is missing or invalid', () => {
  const message = 'hello';
  assert.equal(buildWhatsAppUrl({ phone: null, message }), null);
  assert.equal(buildWhatsAppUrl({ phone: 'abc', message }), null);
  assert.equal(buildWhatsAppUrl({ phone: '01712345678', message: '' }), null);
});
