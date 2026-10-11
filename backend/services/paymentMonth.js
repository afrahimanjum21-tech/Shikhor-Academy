// Canonical payment month key + display formatter + Asia/Dhaka date helpers.
// ONE canonical month key is used for storage, the unique (student_id, month)
// index, due-breakdown matching, and display: `Mon YYYY` (e.g. "Aug 2026"),
// built from a fixed abbreviation table (NOT locale-dependent). Accepts the
// legacy `YYYY-MM` and `YYYY-MM-DD` and `Month YYYY` inputs and normalizes them.
const ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DHAKA = 'Asia/Dhaka';

function ymInDhaka(date) {
  const d = date ? new Date(date) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: DHAKA, year: 'numeric', month: '2-digit' }).formatToParts(d);
  const year = Number(parts.find((p) => p.type === 'year').value);
  const month = Number(parts.find((p) => p.type === 'month').value);
  return { year, monthIndex: month - 1 };
}

// Today's date (YYYY-MM-DD) in Asia/Dhaka — avoids UTC/server-local off-by-one
// around midnight for payment `date` columns.
export function todayDhaka() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: DHAKA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

// Return the canonical `Mon YYYY` key for any supported input, else null.
export function canonicalMonthKey(input) {
  if (input == null || input === '') return null;
  if (input instanceof Date) {
    const ym = ymInDhaka(input);
    return ym ? `${ABBR[ym.monthIndex]} ${ym.year}` : null;
  }
  const s = String(input).trim();
  let m = /^(\d{4})-(\d{2})$/.exec(s);                 // YYYY-MM
  if (m) { const mi = Number(m[2]) - 1; return mi >= 0 && mi <= 11 ? `${ABBR[mi]} ${Number(m[1])}` : null; }
  m = /^([A-Za-z]{3,})\.?\s+(\d{4})$/.exec(s);          // Mon YYYY / Month YYYY
  if (m) { const idx = ABBR.findIndex((a) => a.toLowerCase() === m[1].slice(0, 3).toLowerCase()); return idx >= 0 ? `${ABBR[idx]} ${Number(m[2])}` : null; }
  const ym = ymInDhaka(s);                              // YYYY-MM-DD or any parseable date
  return ym ? `${ABBR[ym.monthIndex]} ${ym.year}` : null;
}

export function displayMonth(input) {
  return canonicalMonthKey(input);
}

export function isValidMonthInput(input) {
  return canonicalMonthKey(input) !== null;
}
