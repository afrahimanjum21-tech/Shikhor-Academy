// Centralised WhatsApp Click-to-Chat helpers for attendance notifications.
//
// This module never sends a message. It only normalizes a guardian number and
// builds a wa.me URL that a teacher opens in WhatsApp, reviews, and sends
// manually. Keeping the templates and encoding here means the admin panel,
// teacher panel, and automated tests all share one implementation.

export const INSTITUTION_NAME = 'Shikhar Academy';
export const INSTITUTION_NAME_BN = 'শিখর একাডেমি';
export const INSTITUTION_FOOTER = 'শিখর একাডেমি — Shikhar Academy';

const BD_COUNTRY_CODE = '880';
const BD_MOBILE_LOCAL = /^01[3-9]\d{8}$/;
const BD_MOBILE_WITHOUT_ZERO = /^1[3-9]\d{8}$/;

// Accept the formats parents actually give us (spaces, dashes, +880, 880,
// 01…, 00880…) but never guess a country code for an unknown international
// number. Returns international digits without a leading '+' because wa.me
// expects the number in that form.
export const normalizeWhatsAppNumber = (raw) => {
  if (raw === null || raw === undefined) return null;

  let digits = String(raw)
    .trim()
    .replace(/^whatsapp:/i, '')
    .replace(/^tel:/i, '')
    .replace(/\D/g, '');

  if (!digits) return null;

  // International access prefix: 00880… is equivalent to +880…
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Bangladeshi domestic mobile formats.
  if (BD_MOBILE_LOCAL.test(digits)) {
    digits = BD_COUNTRY_CODE + digits.slice(1);
  } else if (BD_MOBILE_WITHOUT_ZERO.test(digits)) {
    digits = BD_COUNTRY_CODE + digits;
  }

  if (digits.startsWith(BD_COUNTRY_CODE)) {
    const nationalPart = digits.slice(BD_COUNTRY_CODE.length);
    // 880 + 8–12 national digits covers mobile and landline numbers. A
    // national part starting with 0 would mean an already-coded number was
    // accidentally prefixed again, so reject it rather than corrupt it.
    if (!/^\d{8,12}$/.test(nationalPart) || nationalPart.startsWith('0')) return null;
  } else {
    // Another country's international number: keep it as-is, but only when it
    // is a plausible E.164-length number. A domestic 0-prefixed number without
    // a country code is ambiguous, so do not transform it.
    if (digits.startsWith('0')) return null;
    if (digits.length < 8 || digits.length > 15) return null;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
};

// Show enough for a teacher to recognize the number without exposing the whole
// guardian phone number in the attendance list.
export const maskWhatsAppNumber = (raw) => {
  const number = normalizeWhatsAppNumber(raw);
  if (!number) return null;
  const lastFour = number.slice(-4);
  if (number.startsWith(BD_COUNTRY_CODE)) return `+${BD_COUNTRY_CODE} •••• ${lastFour}`;
  return `+${number.slice(0, 2)} •••• ${lastFour}`;
};

// Reuse the authoritative guardian fields already present on Student. The
// specific guardian number wins; parent numbers are safe fallbacks for older
// records that were admitted before guardian_phone was populated.
export const resolveGuardianPhone = (student) => {
  const candidates = [
    ['guardian_phone', 'Guardian', student?.guardian_phone],
    ['father_phone', 'Father', student?.father_phone],
    ['mother_phone', 'Mother', student?.mother_phone],
  ];

  for (const [field, label, value] of candidates) {
    const number = normalizeWhatsAppNumber(value);
    if (number) return { number, field, label };
  }
  return null;
};

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

export const formatAttendanceDate = (date) => {
  const value = cleanText(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return value;
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate);
};

export const buildClassBatchLabel = ({ courseTitle, batchName } = {}) => {
  const parts = [cleanText(courseTitle), cleanText(batchName)].filter(Boolean);
  return parts.length ? parts.join(' — ') : INSTITUTION_NAME;
};

export const buildAttendanceMessage = ({
  studentName,
  courseTitle,
  batchName,
  date,
  status,
} = {}) => {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (!['present', 'absent'].includes(normalizedStatus)) {
    throw new Error('Attendance status must be present or absent');
  }

  const safeName = cleanText(studentName) || 'Student';
  const formattedDate = formatAttendanceDate(date) || 'the selected date';
  const classBatch = buildClassBatchLabel({ courseTitle, batchName });
  const statusBn = normalizedStatus === 'present' ? 'উপস্থিত' : 'অনুপস্থিত';
  const statusEn = normalizedStatus === 'present' ? 'PRESENT' : 'ABSENT';

  return `প্রিয় অভিভাবক,

আপনার সন্তান ${safeName} আজ ${formattedDate} তারিখে শিখর একাডেমির ${classBatch}-এর ক্লাসে ${statusBn} হিসেবে চিহ্নিত হয়েছে।

Dear Parent/Guardian,

Your child, ${safeName}, has been marked ${statusEn} for the ${classBatch} class at Shikhar Academy on ${formattedDate}.

ধন্যবাদ / Thank you

${INSTITUTION_FOOTER}`;
};

export const buildWhatsAppUrl = ({ phone, message } = {}) => {
  const number = normalizeWhatsAppNumber(phone);
  if (!number || !message) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};
