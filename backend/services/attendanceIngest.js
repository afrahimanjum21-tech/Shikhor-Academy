/**
 * Biometric attendance ingestion — pure mapping logic (no DB).
 *
 * Converts a raw device punch (a timestamp) into the fields the Attendance
 * model needs: the school-local DATE, the SESSION ('morning'|'evening' — the
 * existing enum), the STATUS ('present'|'late'), and the local clock time.
 *
 * Rules are intentionally simple + CONFIGURABLE (env), so they can be tuned
 * once the real machine + the centre's exact session schedule are known:
 *   ATTENDANCE_MORNING_START  (default 09:00)  session start, morning
 *   ATTENDANCE_EVENING_START  (default 16:00)  session start, evening
 *   ATTENDANCE_LATE_GRACE_MIN (default 15)     minutes of grace before 'late'
 *
 * Everything is computed in Asia/Dhaka (the school's local time), matching
 * services/attendanceSession.js, so days/sessions roll over at local time.
 */

const DEFAULTS = {
  morningStart: process.env.ATTENDANCE_MORNING_START || '09:00',
  eveningStart: process.env.ATTENDANCE_EVENING_START || '16:00',
  graceMin: parseInt(process.env.ATTENDANCE_LATE_GRACE_MIN || '15', 10),
};

// Local (Asia/Dhaka) date/time parts for an arbitrary instant.
export function dhakaParts(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  const hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);
  return { dateStr, timeStr: `${get('hour')}:${get('minute')}:${get('second')}`, hour, minute };
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map((n) => parseInt(n, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

// Returns { date, session, status, timeStr } or null for an invalid timestamp.
export function classifyPunch(input, cfg = {}) {
  const p = dhakaParts(input);
  if (!p) return null;
  const morningStart = cfg.morningStart || DEFAULTS.morningStart;
  const eveningStart = cfg.eveningStart || DEFAULTS.eveningStart;
  const graceMin = Number.isFinite(cfg.graceMin) ? cfg.graceMin : DEFAULTS.graceMin;

  const session = p.hour < 12 ? 'morning' : 'evening';
  const start = session === 'morning' ? morningStart : eveningStart;
  const punchMinutes = p.hour * 60 + p.minute;
  const status = punchMinutes <= toMinutes(start) + graceMin ? 'present' : 'late';

  return { date: p.dateStr, session, status, timeStr: p.timeStr };
}

export { DEFAULTS as ATTENDANCE_INGEST_DEFAULTS };
