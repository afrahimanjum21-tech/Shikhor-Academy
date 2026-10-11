import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyBreakdown, summarizeFees } from '../services/feeBreakdown.js';

// I-20 (waiver) + B3 (legacy key matches canonical) + due/total parity. Pure.

const ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const thisMonthKey = () => { const n = new Date(); return `${ABBR[n.getMonth()]} ${n.getFullYear()}`; };
const thisMonthYm = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; };
const iso = (d) => d.toISOString().slice(0, 10);
const student = (admission) => ({ admission_date: admission });

test('I-20: a genuine ৳0 waiver stays 0 (not replaced by the monthly fee)', () => {
  const key = thisMonthKey();
  const b = buildMonthlyBreakdown(student(iso(new Date())), [{ month: key, amount: '0.00', status: 'paid' }], 1500);
  const m = b.find((x) => x.month === key);
  assert.equal(m.amount, 0);
  assert.equal(m.status, 'paid');
});

test('B3: a legacy "YYYY-MM" paid row marks the canonical "Mon YYYY" month paid', () => {
  const key = thisMonthKey();
  const b = buildMonthlyBreakdown(student(iso(new Date())), [{ month: thisMonthYm(), amount: '1500', status: 'paid' }], 1500);
  const m = b.find((x) => x.month === key);
  assert.equal(m.status, 'paid');
});

test('summarizeFees: unpaid months are counted at the fee; totals + dueMonths line up', () => {
  const d = new Date(); d.setMonth(d.getMonth() - 2); // 3 months inclusive, none paid
  const fees = summarizeFees(student(iso(d)), [], 1000);
  assert.equal(fees.dueMonths.length, 3);
  assert.equal(fees.totalDue, 3000);
  assert.equal(fees.totalPaid, 0);
});
