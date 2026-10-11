import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../models/index.js';
import { decideMaterialAccess, decideSubmissionAccess, decideAssignmentAttachmentAccess, shouldLookupMaterial } from '../services/protectedFileAccess.js';

/**
 * Unit tests for the protected-file authorization policy that app.js applies at
 * the /uploads file layer (restricted study materials + student submissions).
 * Pure functions — no HTTP/DB.
 */

after(async () => { try { await sequelize.close(); } catch { /* no connection opened */ } });

// ---- study materials -------------------------------------------------------

test("material: unmanaged file or access_type 'all' is public", () => {
  assert.equal(decideMaterialAccess(null, null, null), 'public');
  assert.equal(decideMaterialAccess({ access_type: 'all' }, null, null), 'public');
  assert.equal(decideMaterialAccess({ access_type: undefined }, null, null), 'public'); // defaults to 'all'
});

test('material: restricted requires authentication', () => {
  assert.equal(decideMaterialAccess({ access_type: 'batch', batch_id: 5 }, null, null), 'unauth');
});

test('material: staff always allowed on restricted', () => {
  const mat = { access_type: 'batch', batch_id: 5 };
  assert.equal(decideMaterialAccess(mat, { role: 'admin', id: 1 }, null), 'allow');
  assert.equal(decideMaterialAccess(mat, { role: 'super_admin', id: 1 }, null), 'allow');
  assert.equal(decideMaterialAccess(mat, { role: 'teacher', id: 1 }, null), 'allow');
});

test('material: student allowed only when enrolled (isUnlocked)', () => {
  const batchMat = { access_type: 'batch', batch_id: 5 };
  assert.equal(decideMaterialAccess(batchMat, { role: 'student', id: 9 }, { batchId: 5 }), 'allow');
  assert.equal(decideMaterialAccess(batchMat, { role: 'student', id: 9 }, { batchId: 7 }), 'forbidden');
  assert.equal(decideMaterialAccess(batchMat, { role: 'student', id: 9 }, null), 'forbidden');

  const courseMat = { access_type: 'course', course_id: 3 };
  assert.equal(decideMaterialAccess(courseMat, { role: 'student', id: 9 }, { courseId: 3 }), 'allow');
  assert.equal(decideMaterialAccess(courseMat, { role: 'student', id: 9 }, { courseId: 4 }), 'forbidden');

  const classMat = { access_type: 'class', class_name: 'A' };
  assert.equal(decideMaterialAccess(classMat, { role: 'student', id: 9 }, { section: 'a' }), 'allow');
  assert.equal(decideMaterialAccess(classMat, { role: 'student', id: 9 }, { section: 'b' }), 'forbidden');
});

// ---- assignment submissions ------------------------------------------------

test('submission: unknown file is public, missing token is unauth', () => {
  assert.equal(decideSubmissionAccess(null, { role: 'student', id: 1 }), 'public');
  assert.equal(decideSubmissionAccess({ Student: { user_id: 1 } }, null), 'unauth');
});

test('submission: staff allowed; only the owning student allowed', () => {
  const sub = { Student: { user_id: 42 } };
  assert.equal(decideSubmissionAccess(sub, { role: 'admin', id: 1 }), 'allow');
  assert.equal(decideSubmissionAccess(sub, { role: 'teacher', id: 1 }), 'allow');
  assert.equal(decideSubmissionAccess(sub, { role: 'student', id: 42 }), 'allow');   // owner
  assert.equal(decideSubmissionAccess(sub, { role: 'student', id: 99 }), 'forbidden'); // other student
});

// ---- teacher assignment attachments (C12) ----------------------------------

test('attachment: unmanaged file public; restricted needs auth', () => {
  assert.equal(decideAssignmentAttachmentAccess(null, null, null), 'public');
  assert.equal(decideAssignmentAttachmentAccess({ batch_id: 5 }, null, null), 'unauth');
});

test('attachment: staff allowed; student only when enrolled in the batch', () => {
  const att = { batch_id: 5 };
  assert.equal(decideAssignmentAttachmentAccess(att, { role: 'admin', id: 1 }, null), 'allow');
  assert.equal(decideAssignmentAttachmentAccess(att, { role: 'teacher', id: 1 }, null), 'allow');
  assert.equal(decideAssignmentAttachmentAccess(att, { role: 'student', id: 9 }, { batchId: 5 }), 'allow');
  assert.equal(decideAssignmentAttachmentAccess(att, { role: 'student', id: 9 }, { batchId: 7 }), 'forbidden');
  assert.equal(decideAssignmentAttachmentAccess(att, { role: 'student', id: 9 }, null), 'forbidden');
});

// ---- H-low10: image extension must not bypass the material lookup ----------

test('shouldLookupMaterial: general folder is always checked (even images)', () => {
  assert.equal(shouldLookupMaterial('general', 'notes.pdf'), true);
  assert.equal(shouldLookupMaterial('general', 'secret.png'), true);   // H-low10: no bypass
  assert.equal(shouldLookupMaterial('general', 'secret.JPG'), true);
});

test('shouldLookupMaterial: other folders skip only genuine images', () => {
  assert.equal(shouldLookupMaterial('faculty', 'photo.jpg'), false);   // fast public image
  assert.equal(shouldLookupMaterial('gallery', 'pic.webp'), false);
  assert.equal(shouldLookupMaterial('misc', 'report.pdf'), true);      // non-image still checked
});
