import models from '../models/index.js';
import { Op } from 'sequelize';

// Next sequential student card number: `UCC-<year>-<4 digits>`. Reads
// MAX(existing suffix) + 1 (so soft-deleted / reused numbers never collide).
// NOT race-proof on its own — always pair the write with withStudentIdRetry so
// a concurrent insert that grabbed the same number is retried with a fresh one.
export async function nextStudentId(options = {}) {
  const year = new Date().getFullYear();
  const prefix = `UCC-${year}-`;
  const rows = await models.Student.findAll({
    where: { student_id_card_no: { [Op.like]: `${prefix}%` } },
    attributes: ['student_id_card_no'],
    ...options,
  });
  let max = 0;
  for (const row of rows) {
    const n = parseInt(String(row.student_id_card_no).slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

// True when `err` is a unique-constraint violation on the student card number.
export function isStudentIdConflict(err) {
  if (!err || err.name !== 'SequelizeUniqueConstraintError') return false;
  const fields = err.fields ? Object.keys(err.fields) : [];
  if (fields.some((f) => /student_id_card_no/i.test(f))) return true;
  return /student_id_card_no/i.test(String(err.message || ''));
}

// Run `fn(attempt)` — typically a whole DB transaction that generates a fresh
// student id via nextStudentId. If it fails with a student-id unique conflict,
// re-run it so the regenerated MAX+1 clears the concurrent insert (the aborted
// transaction is rolled back on each failed attempt, so the retry starts clean).
// Any other error propagates immediately. Bounded retries.
export async function withStudentIdRetry(fn, maxRetries = 6) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (isStudentIdConflict(err) && attempt < maxRetries) continue;
      throw err;
    }
  }
  throw lastErr;
}
