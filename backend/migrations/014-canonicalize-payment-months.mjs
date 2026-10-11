/**
 * 014-canonicalize-payment-months
 *
 * Normalizes `Payments.month` to the canonical display key `Mon YYYY`
 * (e.g. "Aug 2026") so the (student_id, month) unique index and the fee
 * breakdown can never treat `2026-08` and `Aug 2026` as different real months.
 *
 * Safety properties:
 *  - Detects same-student + same-real-month duplicates across formats FIRST and
 *    ABORTS with a report (no change) if any exist — a human must reconcile real
 *    payment history; this migration never merges or deletes a payment row.
 *  - Only rewrites the `month` string to its canonical form; never touches
 *    amounts, status, dates, or any other column.
 *  - Idempotent (re-running only canonicalizes what remains) and forward-only.
 */
import models from '../models/index.js';
import { canonicalMonthKey } from '../services/paymentMonth.js';

export async function up() {
  const rows = await models.Payment.findAll({ attributes: ['id', 'student_id', 'month'] });

  // 1) Detect cross-format duplicates for the same student + real month.
  const seen = new Map();
  const collisions = [];
  for (const r of rows) {
    if (!r.month) continue;
    const canon = canonicalMonthKey(r.month);
    if (!canon) continue;
    const k = `${r.student_id}|${canon}`;
    if (seen.has(k) && seen.get(k) !== r.id) collisions.push(`(student ${r.student_id}, ${canon})`);
    else if (!seen.has(k)) seen.set(k, r.id);
  }
  if (collisions.length > 0) {
    throw new Error(
      `Aborting without changes: ${collisions.length} duplicate payment row(s) represent the same student+real month across formats ` +
      `(e.g. '2026-08' and 'Aug 2026'). Reconcile these manually first — this migration never merges or deletes payment history. ` +
      `Affected: ${collisions.slice(0, 20).join(', ')}${collisions.length > 20 ? ', …' : ''}`
    );
  }

  // 2) No collisions -> rewrite each month to its canonical form.
  let changed = 0;
  for (const r of rows) {
    if (!r.month) continue;
    const canon = canonicalMonthKey(r.month);
    if (canon && canon !== r.month) {
      await r.update({ month: canon }, { silent: true });
      changed += 1;
    }
  }
  console.log(`  ~ canonicalized ${changed} payment month key(s)`);
}

export async function down() {
  throw new Error('down() for 014-canonicalize-payment-months is disabled (the original mixed month formats cannot be reconstructed).');
}
