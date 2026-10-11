// Pure authorization POLICY for protected /uploads files, split out from app.js
// so it can be unit-tested without HTTP/DB. The caller performs all IO (record
// lookup + token decode) and passes the results in; these functions only decide.
//
// Return values:
//   'public'    -> not protected (unknown file / access_type 'all'); serve to anyone
//   'allow'     -> authorized; serve (caller sets private cache headers)
//   'unauth'    -> no/invalid token; respond 401
//   'forbidden' -> authenticated but not permitted; respond 403
import { isUnlocked } from './accessControl.js';

const STAFF_ROLES = ['admin', 'super_admin', 'teacher'];

// Restricted study materials (access_type 'batch' | 'course' | 'class'). An
// 'all' material — or a file not backed by any StudyMaterial row — is public.
// `student` is the resolveStudentAccess() profile ({ batchId, courseId, section })
// or null; it is only consulted for a student viewer.
export function decideMaterialAccess(material, viewer, student) {
  if (!material) return 'public';
  const type = material.access_type || 'all';
  if (type === 'all') return 'public';
  if (!viewer) return 'unauth';
  if (STAFF_ROLES.includes(viewer.role)) return 'allow';
  if (viewer.role === 'student' && student && isUnlocked(material, student)) return 'allow';
  return 'forbidden';
}

// Student assignment submissions: only the owning student or staff may download.
// `submission` must be loaded with its Student ({ user_id }); null => unknown file.
export function decideSubmissionAccess(submission, viewer) {
  if (!submission) return 'public';
  if (!viewer) return 'unauth';
  if (STAFF_ROLES.includes(viewer.role)) return 'allow';
  const ownerUserId = submission.Student && submission.Student.user_id;
  if (viewer.role === 'student' && ownerUserId && ownerUserId === viewer.id) return 'allow';
  return 'forbidden';
}

// Teacher assignment ATTACHMENTS (the task/question file a teacher attaches to an
// Assignment). These share the `/uploads/assignments/` folder with student
// submissions, but are backed by an `Assignment` row (not AssignmentSubmission).
// Staff may download; a student may download only if enrolled in the
// assignment's batch; everyone else is denied. A file backed by NO Assignment
// (and no submission) is treated as public/legacy by the caller.
//   `assignment` — the Assignment row ({ batch_id }) or null.
//   `student`    — resolveStudentAccess() profile ({ batchId, ... }) or null.
export function decideAssignmentAttachmentAccess(assignment, viewer, student) {
  if (!assignment) return 'public';
  if (!viewer) return 'unauth';
  if (STAFF_ROLES.includes(viewer.role)) return 'allow';
  if (
    viewer.role === 'student' &&
    student &&
    assignment.batch_id != null &&
    Number(student.batchId) === Number(assignment.batch_id)
  ) {
    return 'allow';
  }
  return 'forbidden';
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|ico|avif|bmp)$/i;

// Decide whether the /uploads gate must run the StudyMaterial authorization
// lookup for a file. Restricted study materials live in the `general` folder,
// so a `general` file must ALWAYS be checked — even with an image extension
// (otherwise a restricted material saved as .png/.jpg bypasses the gate,
// finding H-low10). For other folders (faculty photos, gallery, thumbnails,
// admission snaps) an image extension can safely skip the lookup to keep public
// pages fast; a non-image there still gets looked up (returns public if
// unmanaged). The decision is by explicit folder policy, never by filename alone.
export function shouldLookupMaterial(folder, filename) {
  if (folder === 'general') return true;
  return !IMAGE_EXT_RE.test(filename);
}

