// One attendance-percentage rule, shared by the student stats endpoint, the
// student dashboard, and (mirrored) the admin monthly sheet, so they can never
// disagree (I-19).
//
// Eligible days (the denominator) = present + absent + late + APPROVED leave.
// EXCLUDED from the denominator entirely:
//   - pending leave  (not yet decided — must not drag the percentage down)
//   - rejected leave (the request was denied; the row is not an eligible class)
// Approved leave is counted as an eligible day (an excused day) but NOT as a
// present day, so it does not inflate the numerator.
//
// percentage = round(present / eligibleDays * 100), 0 when there are no
// eligible days. Pure — no DB.
export function attendanceSummary({ present = 0, absent = 0, late = 0, approvedLeave = 0 } = {}) {
  const p = Number(present) || 0;
  const a = Number(absent) || 0;
  const l = Number(late) || 0;
  const al = Number(approvedLeave) || 0;
  const eligibleDays = p + a + l + al;
  const percentage = eligibleDays > 0 ? Math.round((p / eligibleDays) * 100) : 0;
  return { present: p, absent: a, late: l, approvedLeave: al, eligibleDays, percentage };
}
