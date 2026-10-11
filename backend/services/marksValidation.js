// Shared strict marks validation for every teacher-facing mark/grade writer
// (I-14, J). The contract is REJECT, not clamp: a non-numeric, negative, or
// above-full-mark value is a data-entry error that must surface as a 4xx so the
// teacher fixes it — silently capping (the old TeacherResultController
// behaviour) hid "650 instead of 65" style mistakes. Nothing invalid is ever
// persisted. Pure — no DB.

// Full marks for a subject: subject_marks[subject] if a positive number, else
// exam.total_marks if positive, else the established default of 100.
export function fullMarksForSubject(exam, subject) {
  const sm = parseFloat(exam?.subject_marks?.[subject]);
  if (Number.isFinite(sm) && sm > 0) return sm;
  const tm = parseFloat(exam?.total_marks);
  if (Number.isFinite(tm) && tm > 0) return tm;
  return 100;
}

// Validate one obtained mark against an upper bound (full marks). Returns
// { ok: true, value } or { ok: false, reason }.
export function validateMark(value, fullMarks) {
  if (value === '' || value === null || value === undefined) return { ok: false, reason: 'is required' };
  const n = Number(value);
  if (!Number.isFinite(n)) return { ok: false, reason: 'must be a number' };
  if (n < 0) return { ok: false, reason: 'cannot be negative' };
  if (Number.isFinite(fullMarks) && fullMarks > 0 && n > fullMarks) {
    return { ok: false, reason: `cannot exceed the full marks (${fullMarks})` };
  }
  return { ok: true, value: n };
}

// Validate a whole marks_details object ({ subject: obtained }) against the
// exam's per-subject full marks. `allowedSubjects` (optional Set) limits which
// keys are checked/kept. Empty/blank values are SKIPPED (treated as "not
// entered" rather than 0 or an error) so a bulk sheet with blank cells saves;
// any present value must be valid. Returns { ok, clean } or { ok:false, reason }.
export function validateMarksDetails(exam, marksDetails, allowedSubjects = null) {
  const marks = marksDetails && typeof marksDetails === 'object' && !Array.isArray(marksDetails) ? marksDetails : {};
  const clean = {};
  for (const [subject, value] of Object.entries(marks)) {
    if (allowedSubjects && !allowedSubjects.has(subject)) continue;
    if (value === '' || value === null || value === undefined) continue; // blank = not entered
    const check = validateMark(value, fullMarksForSubject(exam, subject));
    if (!check.ok) return { ok: false, reason: `${subject}: marks ${check.reason}` };
    clean[subject] = check.value;
  }
  return { ok: true, clean };
}
