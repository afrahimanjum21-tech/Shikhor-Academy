// Normalizes an Attendance leave-request row (loaded with its Student → User and
// its Approver) into ONE stable, lowercase-keyed shape the admin Leave Requests
// UI consumes (B4). The frontend reads `r.student.user.name`; the raw Sequelize
// row exposes `r.Student.User`, so without this the name is always "Unknown"
// and the search filter never matches. Pure — accepts a model instance or a
// plain object; never throws on a missing related user.
export function serializeLeaveRequest(row) {
  if (!row) return null;
  const r = typeof row.get === 'function' ? row.get({ plain: true }) : row;
  const student = r.Student || r.student || null;
  const user = student ? (student.User || student.user || null) : null;
  const approver = r.Approver || r.approver || null;
  return {
    id: r.id,
    date: r.date,
    session: r.session,
    status: r.status,
    leave_status: r.leave_status,
    leave_reason: r.leave_reason,
    leave_requested_at: r.leave_requested_at,
    leave_approved_at: r.leave_approved_at,
    punch_out_at: r.punch_out_at,
    student: student
      ? {
          id: student.id,
          card_no: student.student_id_card_no || null,
          user: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null,
        }
      : null,
    approver: approver ? { id: approver.id, name: approver.name } : null,
  };
}

export function serializeLeaveRequests(rows) {
  return (rows || []).map(serializeLeaveRequest);
}
