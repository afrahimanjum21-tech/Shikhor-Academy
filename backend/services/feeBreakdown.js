import { canonicalMonthKey } from './paymentMonth.js';

// Single source of truth for a student's monthly fee breakdown + totals, shared
// by the fees page (PaymentController) and the student dashboard so "total due"
// can never disagree between the two.
export function buildMonthlyBreakdown(student, payments, monthlyFee) {
  const start = student.admission_date ? new Date(student.admission_date) : new Date();
  const end = new Date();

  const paidByMonth = new Map();
  (payments || []).forEach((payment) => {
    const json = payment.toJSON ? payment.toJSON() : payment;
    const key = json.month ? canonicalMonthKey(json.month) : (json.date ? canonicalMonthKey(json.date) : null);
    if (key) paidByMonth.set(key, json);
  });

  const monthly = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    const month = canonicalMonthKey(cursor);
    const payment = paidByMonth.get(month);
    monthly.push({
      month,
      // A genuine ৳0 waiver must stay 0: use the row's amount when a row exists
      // (even if 0); only fall back to the fee for a month with NO payment row.
      amount: payment ? parseFloat(payment.amount) : monthlyFee,
      status: payment?.status || 'due',
      method: payment?.method || null,
      trx_id: payment?.trx_id || null,
      date: payment?.date || null,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return monthly;
}

export function summarizeFees(student, payments, monthlyFee) {
  const rows = (payments || []).map((p) => (p.toJSON ? p.toJSON() : p));
  const monthlyBreakdown = buildMonthlyBreakdown(student, rows, monthlyFee);
  const paidMonths = monthlyBreakdown.filter((m) => m.status === 'paid').map((m) => m.month);
  const dueMonths = monthlyBreakdown.filter((m) => m.status !== 'paid').map((m) => m.month);
  const totalPaid = rows.filter((p) => p.status === 'paid').reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalDue = monthlyBreakdown.filter((m) => m.status !== 'paid').reduce((s, m) => s + parseFloat(m.amount || 0), 0);
  const pendingPayments = rows.filter((p) => p.status === 'pending');
  return { monthlyBreakdown, paidMonths, dueMonths, totalPaid, totalDue, pendingPayments };
}
