// Derive consistent start_time/end_time from a routine's `time_slot` label so
// the unique index (batch_id, day, start_time, end_time, status) is meaningful
// and `myRoutine` can sort reliably (D5). Pure — no DB.
//
// `time_slot` is an admin-entered label. When it encodes a range
// ("08:00-09:00", "9:00 AM – 10:00 AM", "10:00 to 11:00") we split it; any
// other label (e.g. "Period 1") is used verbatim as BOTH bounds so the key is
// never NULL. We never invent times beyond what the label already states, so
// timetable rules are unchanged.
export function parseTimeSlot(timeSlot) {
  const raw = String(timeSlot == null ? '' : timeSlot).trim();
  if (!raw) return { start_time: '', end_time: '' };
  // Split on a dash/en-dash/em-dash or the word "to", surrounded by optional spaces.
  const m = raw.match(/^(.+?)\s*(?:-|–|—|to)\s*(.+?)$/i);
  if (m && m[1].trim() && m[2].trim()) {
    return { start_time: m[1].trim(), end_time: m[2].trim() };
  }
  return { start_time: raw, end_time: raw };
}
