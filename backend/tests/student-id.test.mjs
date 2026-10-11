import test, { afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import models, { sequelize } from '../models/index.js';
import { nextStudentId, isStudentIdConflict, withStudentIdRetry } from '../services/studentId.js';

// C14 — concurrency-safe student card-number generation. No DB (findAll stubbed).

const origFindAll = models.Student.findAll;
afterEach(() => { models.Student.findAll = origFindAll; });
after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

const uniqueErr = (field = 'student_id_card_no') => {
  const e = new Error('duplicate'); e.name = 'SequelizeUniqueConstraintError'; e.fields = { [field]: 'x' }; return e;
};

test('nextStudentId returns MAX(suffix)+1, zero-padded, for the current year', async () => {
  const year = new Date().getFullYear();
  models.Student.findAll = async () => [
    { student_id_card_no: `UCC-${year}-0007` },
    { student_id_card_no: `UCC-${year}-0012` },
    { student_id_card_no: `UCC-${year}-0003` },
  ];
  assert.equal(await nextStudentId(), `UCC-${year}-0013`);
});

test('nextStudentId starts at 0001 when none exist', async () => {
  const year = new Date().getFullYear();
  models.Student.findAll = async () => [];
  assert.equal(await nextStudentId(), `UCC-${year}-0001`);
});

test('isStudentIdConflict matches only the card-number unique violation', () => {
  assert.equal(isStudentIdConflict(uniqueErr('student_id_card_no')), true);
  assert.equal(isStudentIdConflict(uniqueErr('email')), false);
  assert.equal(isStudentIdConflict(new Error('other')), false);
  assert.equal(isStudentIdConflict(null), false);
});

test('withStudentIdRetry retries a student-id conflict, then succeeds', async () => {
  let calls = 0;
  const out = await withStudentIdRetry(async () => { calls += 1; if (calls < 3) throw uniqueErr(); return 'ok'; });
  assert.equal(out, 'ok');
  assert.equal(calls, 3);
});

test('withStudentIdRetry rethrows a non-conflict error immediately', async () => {
  let calls = 0;
  await assert.rejects(() => withStudentIdRetry(async () => { calls += 1; throw new Error('boom'); }), /boom/);
  assert.equal(calls, 1);
});

test('withStudentIdRetry maxRetries=0 surfaces an admin-id conflict without retrying', async () => {
  let calls = 0;
  await assert.rejects(() => withStudentIdRetry(async () => { calls += 1; throw uniqueErr(); }, 0));
  assert.equal(calls, 1);
});
