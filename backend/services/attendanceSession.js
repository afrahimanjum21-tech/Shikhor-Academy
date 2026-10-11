// One consistent attendance time/session helper shared by the admin AND teacher
// entry paths (C3). The unique index (student_id, batch_id, date, session)
// treats a NULL session as distinct, so EVERY writer must resolve a non-null
// 'morning'|'evening' — otherwise re-saves silently create duplicate rows.

// Calendar date (YYYY-MM-DD) in the school's local timezone (Asia/Dhaka, UTC+6),
// so days roll over at local midnight, not UTC midnight.
export const todayLocalDate = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());

// Clock time (HH:MM:SS) in Asia/Dhaka. The server runs on UTC, so a raw
// toTimeString() would be six hours behind real local life.
export const dhakaTime = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('hour')}:${get('minute')}:${get('second')}`;
};

// Deterministic, NON-NULL session. An explicit 'morning'/'evening' is honoured;
// anything else resolves from the current Dhaka hour (before noon = morning).
export const resolveSession = (session) => {
  if (session === 'morning' || session === 'evening') return session;
  const hour = parseInt(dhakaTime().split(':')[0], 10);
  return hour < 12 ? 'morning' : 'evening';
};
