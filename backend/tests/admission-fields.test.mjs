import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../models/index.js';
import { normalizeEmail } from '../utils/normalizeEmail.js';
import { prepareAdmissionFields } from '../controllers/Public/AdmissionController.js';

// C8 (blank optional admission fields) + C9 (email normalization).

after(async () => { try { await sequelize.close(); } catch { /* no connection */ } });

test('normalizeEmail trims + lowercases; passes through non-strings', () => {
  assert.equal(normalizeEmail('  Foo@Bar.COM '), 'foo@bar.com');
  assert.equal(normalizeEmail('a@b.com'), 'a@b.com');
  assert.equal(normalizeEmail(null), null);
  assert.equal(normalizeEmail(undefined), undefined);
});

test('prepareAdmissionFields coerces blank course_id/dob to null and normalizes email', () => {
  assert.deepEqual(
    prepareAdmissionFields({ course_id: '', dob: '', email: ' A@B.com ' }),
    { course_id: null, dob: null, email: 'a@b.com' },
  );
  assert.deepEqual(
    prepareAdmissionFields({ course_id: undefined, dob: undefined, email: undefined }),
    { course_id: null, dob: null, email: null },
  );
});

test('prepareAdmissionFields keeps a valid course_id/dob', () => {
  assert.deepEqual(
    prepareAdmissionFields({ course_id: '5', dob: '2008-01-02', email: 'x@y.com' }),
    { course_id: '5', dob: '2008-01-02', email: 'x@y.com' },
  );
});

test('prepareAdmissionFields rejects a non-numeric course_id (validation, not a 500)', () => {
  assert.deepEqual(prepareAdmissionFields({ course_id: 'abc' }), { error: 'Invalid course selected' });
});
