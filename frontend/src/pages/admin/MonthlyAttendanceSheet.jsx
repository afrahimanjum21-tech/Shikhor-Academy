import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { Calendar, ChevronLeft, ChevronRight, Clock, Loader2, Save } from "lucide-react";
import notify from "../../services/notification";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const sessionLabel = { morning: "M", evening: "E" };
const SESSIONS = ["morning", "evening"];
const statusOptions = ["present", "absent", "late"];

export default function MonthlyAttendanceSheet() {
    const [courses, setCourses] = useState([]);
    const [courseId, setCourseId] = useState("");
    const [monthDate, setMonthDate] = useState(new Date());
    const [data, setData] = useState(null);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => {
        api.get("/admin/courses").then((res) => setCourses(res.data));
    }, []);

    const fetchLeaveRequests = useCallback(async () => {
        try {
            const res = await api.get("/admin/attendance/leave-requests");
            setLeaveRequests(res.data || []);
        } catch (err) {
            console.error("Failed to load leave requests", err);
        }
    }, []);

    useEffect(() => { fetchLeaveRequests(); }, [fetchLeaveRequests]);

    const fetchSheet = useCallback(async () => {
        if (!courseId) return;
        setLoading(true);
        try {
            const res = await api.get("/admin/attendance/monthly", {
                params: {
                    course_id: courseId,
                    month: monthDate.getMonth() + 1,
                    year: monthDate.getFullYear(),
                },
            });
            setData(res.data);
        } catch (err) {
            notify.error(err.response?.data?.message || "Failed to load attendance sheet");
        } finally {
            setLoading(false);
        }
    }, [courseId, monthDate]);

    useEffect(() => { fetchSheet(); }, [fetchSheet]);

    const shiftMonth = (delta) => {
        const next = new Date(monthDate);
        next.setMonth(next.getMonth() + delta);
        setMonthDate(next);
    };

    const saveCell = async (form) => {
        try {
            await api.post("/admin/attendance/cell", {
                student_id: editing.student.id,
                course_id: courseId,
                date: editing.date,
                session: editing.session,
                status: form.status,
                punch_in_at: form.punch_in_at || null,
                punch_out_at: form.punch_out_at || null,
            });
            setEditing(null);
            fetchSheet();
        } catch (err) {
            notify.error(err.response?.data?.message || "Failed to save attendance");
        }
    };

    const approveLeave = async (id, action) => {
        try {
            await api.post(`/admin/attendance/leave-requests/${id}/${action}`);
            notify.success(action === "approve" ? "Leave approved" : "Leave rejected");
            setLeaveRequests((prev) => prev.filter((request) => request.id !== id));
            fetchSheet();
        } catch (err) {
            notify.error(err.response?.data?.message || "Failed to update leave request");
        }
    };

    const dayEntries = data?.dates || [];
    const pendingLeaves = leaveRequests.filter((request) => request.leave_status === "pending");

    const dailySummary = {};
    (data?.sheet || []).forEach((row) =>
        row.days.forEach((entry) => {
            SESSIONS.forEach((session) => {
                const cell = entry[session];
                if (!cell) return;
                if (!dailySummary[entry.date]) dailySummary[entry.date] = { present: 0, absent: 0, late: 0, leave: 0 };
                if (cell.status === "present") dailySummary[entry.date].present += 1;
                else if (cell.status === "absent") dailySummary[entry.date].absent += 1;
                else if (cell.status === "late") dailySummary[entry.date].late += 1;
                if (cell.leave_status === "approved") dailySummary[entry.date].leave += 1;
            });
        })
    );

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 md:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4">
                    <div>
                        <h1 className="text-lg md:text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                            <Calendar size={20} className="md:size-6" /> Attendance Sheet
                        </h1>
                        <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">Morning and evening attendance with punch in/out tracking.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                        <select className="border border-gray-300 p-2 rounded-lg text-sm bg-white w-full sm:w-auto" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                            <option value="">Select Course</option>
                            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                        </select>
                        <div className="flex items-center gap-1 border border-gray-300 rounded-lg bg-white self-start sm:self-auto">
                            <button onClick={() => shiftMonth(-1)} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-l"><ChevronLeft size={14} className="md:size-4"/></button>
                            <span className="px-2 md:px-3 text-xs md:text-sm font-bold w-28 md:w-40 text-center">{MONTH_NAMES[monthDate.getMonth()]} {monthDate.getFullYear()}</span>
                            <button onClick={() => shiftMonth(1)} className="p-1.5 md:p-2 hover:bg-gray-100 rounded-r"><ChevronRight size={14} className="md:size-4"/></button>
                        </div>
                    </div>
                </div>
            </div>

            {pendingLeaves.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h2 className="font-bold text-amber-800 mb-3">Pending Leave Requests</h2>
                    <div className="grid gap-2">
                        {pendingLeaves.map((request) => (
                            <div key={request.id} className="bg-white rounded border border-amber-100 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="text-sm">
                                    <p className="font-bold text-gray-800">{request.Student?.User?.name} - {request.date} ({request.session})</p>
                                    <p className="text-gray-500">Punch out: {request.punch_out_at || "-"} | {request.leave_reason}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => approveLeave(request.id, "approve")} className="px-3 py-1.5 rounded bg-green-600 text-white text-sm font-bold">Approve</button>
                                    <button onClick={() => approveLeave(request.id, "reject")} className="px-3 py-1.5 rounded bg-red-50 text-red-700 text-sm font-bold border border-red-100">Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!courseId ? (
                <EmptyState text="Select a course to view attendance" />
            ) : loading ? (
                <div className="bg-white rounded-lg border border-gray-200 p-10 text-center flex items-center justify-center gap-2 text-[#1F4E79]">
                    <Loader2 className="animate-spin" size={20}/> Loading attendance...
                </div>
            ) : data?.sheet?.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
                        <table className="border-separate border-spacing-0 text-xs min-w-full">
                            <thead className="sticky top-0 z-20">
                                <tr>
                                    <th rowSpan="2" className="sticky left-0 z-30 bg-gray-100 border-b border-r border-gray-300 px-3 py-2 text-left min-w-48">Student</th>
                                    {dayEntries.map((date) => (
                                        <th key={date} colSpan={SESSIONS.length} className="border-b border-r border-gray-300 px-2 py-1 text-center bg-blue-50">
                                            {parseInt(date.slice(8), 10)}
                                        </th>
                                    ))}
                                    <th rowSpan="2" className="sticky right-24 z-30 bg-green-50 border-b border-l border-gray-300 px-3 py-2">P/L</th>
                                    <th rowSpan="2" className="sticky right-0 z-30 bg-blue-50 border-b border-l border-gray-300 px-3 py-2">%</th>
                                </tr>
                                <tr>
                                    {dayEntries.map((date) => SESSIONS.map((session) => (
                                        <th key={`${date}-${session}`} className="border-b border-r border-gray-200 bg-white px-2 py-1 text-center text-[10px] uppercase text-gray-500">
                                            {sessionLabel[session]}
                                        </th>
                                    )))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.sheet.map((row) => {
                                    const counts = row.days.reduce(
                                        (acc, entry) => {
                                            SESSIONS.forEach((session) => {
                                                const cell = entry[session];
                                                if (!cell) return;
                                                // I-19: pending/rejected leave are NOT eligible days —
                                                // exclude them from the denominator so they don't
                                                // deflate the percentage.
                                                if (cell.leave_status === "pending" || cell.leave_status === "rejected") return;
                                                const approvedLeave = cell.leave_status === "approved" || cell.status === "leave";
                                                if (cell.status === "present") { acc.present += 1; acc.marked += 1; }
                                                else if (cell.status === "absent" || cell.status === "late") { acc.marked += 1; }
                                                else if (approvedLeave) { acc.leave += 1; acc.marked += 1; }
                                            });
                                            return acc;
                                        },
                                        { present: 0, leave: 0, marked: 0 }
                                    );
                                    const percentage = counts.marked ? Math.round((counts.present / counts.marked) * 100) : 0;
                                    return (
                                        <tr key={row.student.id} className="hover:bg-blue-50/30">
                                            <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-3 py-2">
                                                <p className="font-bold text-gray-800 whitespace-nowrap">{row.student.name}</p>
                                                <p className="font-mono text-[10px] text-gray-400">{row.student.card_no}</p>
                                            </td>
                                            {row.days.map((entry) => SESSIONS.map((session) => {
                                                const cell = entry[session] || {};
                                                return (
                                                    <td key={`${entry.date}-${session}`} className="border-b border-r border-gray-100 p-1 text-center">
                                                        <button
                                                            onClick={() => setEditing({ student: row.student, date: entry.date, session, cell })}
                                                            className="w-16 min-h-12 rounded border border-gray-200 hover:border-[#1F4E79] bg-white px-1 py-1"
                                                        >
                                                            <StatusPill cell={cell} />
                                                        </button>
                                                    </td>
                                                );
                                            }))}
                                            <td className="sticky right-24 z-10 bg-green-50 border-b border-l border-gray-200 px-3 py-2 text-center font-bold text-gray-700">
                                                {counts.present}+{counts.leave}/{counts.marked}
                                            </td>
                                            <td className="sticky right-0 z-10 bg-blue-50 border-b border-l border-gray-200 px-3 py-2 text-center font-bold text-[#1F4E79]">
                                                {percentage}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="sticky bottom-0 z-20">
                                <tr>
                                    <td className="sticky left-0 z-30 bg-gray-100 border-t border-r border-gray-300 px-3 py-2 font-bold">Daily P/A/L/Leave</td>
                                    {dayEntries.map((date) => {
                                        const summary = dailySummary[date] || {};
                                        return (
                                            <td key={date} colSpan={SESSIONS.length} className="bg-gray-50 border-t border-r border-gray-200 px-2 py-2 text-center font-bold text-[10px]">
                                                {summary.present || 0}/{summary.absent || 0}/{summary.late || 0}/{summary.leave || 0}
                                            </td>
                                        );
                                    })}
                                    <td className="sticky right-24 z-30 bg-gray-100 border-t border-l border-gray-300"></td>
                                    <td className="sticky right-0 z-30 bg-gray-100 border-t border-l border-gray-300"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                <EmptyState text="No students found for this course" />
            )}

            {editing && (
                <AttendanceModal
                    editing={editing}
                    onClose={() => setEditing(null)}
                    onSave={saveCell}
                />
            )}
        </div>
    );
}

function StatusPill({ cell }) {
    if (cell.leave_status === "approved") {
        return <CellBadge label="LV" className="bg-purple-100 text-purple-700 border-purple-200" sub={cell.punch_out_at} />;
    }
    if (cell.leave_status === "pending") {
        return <CellBadge label="REQ" className="bg-amber-100 text-amber-700 border-amber-200" sub={cell.punch_out_at} />;
    }
    if (cell.leave_status === "rejected") {
        return <CellBadge label="RJ" className="bg-rose-100 text-rose-700 border-rose-200" sub="Rejected" />;
    }
    if (cell.status === "present") return <CellBadge label="P" className="bg-green-100 text-green-700 border-green-200" sub={`${cell.punch_in_at || "--"}-${cell.punch_out_at || "--"}`} />;
    if (cell.status === "absent") return <CellBadge label="A" className="bg-red-100 text-red-700 border-red-200" sub="Absent" />;
    if (cell.status === "late") return <CellBadge label="L" className="bg-yellow-100 text-yellow-700 border-yellow-200" sub={cell.punch_in_at} />;
    if (cell.status === "leave") return <CellBadge label="LV" className="bg-purple-100 text-purple-700 border-purple-200" sub="Leave" />;
    return <CellBadge label="-" className="bg-gray-50 text-gray-400 border-gray-200" sub="Set" />;
}

function CellBadge({ label, className, sub }) {
    return (
        <span className={`block rounded border px-1 py-1 ${className}`}>
            <span className="block text-xs font-black">{label}</span>
            <span className="block text-[9px] truncate">{sub || "--"}</span>
        </span>
    );
}

function AttendanceModal({ editing, onClose, onSave }) {
    const [form, setForm] = useState({
        status: statusOptions.includes(editing.cell.status) ? editing.cell.status : "present",
        punch_in_at: editing.cell.punch_in_at || (editing.session === "morning" ? "08:00" : "15:00"),
        punch_out_at: editing.cell.punch_out_at || (editing.session === "morning" ? "10:00" : "17:00"),
    });

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 responsive-modal">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="font-bold text-lg text-[#1F4E79]">Edit Attendance</h2>
                <p className="text-sm text-gray-500 mt-1">{editing.student.name} - {editing.date} ({editing.session})</p>

                <div className="space-y-4 mt-5">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Status</label>
                        <div className="grid grid-cols-3 gap-2">
                            {statusOptions.map((status) => (
                                <button
                                    type="button"
                                    key={status}
                                    onClick={() => setForm({ ...form, status })}
                                    className={`rounded border px-3 py-2 text-sm font-bold capitalize ${form.status === status ? "bg-[#1F4E79] text-white border-[#1F4E79]" : "bg-white text-gray-600 border-gray-200"}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <TimeField label="Punch In" value={form.punch_in_at} onChange={(value) => setForm({ ...form, punch_in_at: value })} />
                        <TimeField label="Punch Out" value={form.punch_out_at} onChange={(value) => setForm({ ...form, punch_out_at: value })} />
                    </div>

                    {editing.cell.leave_status && editing.cell.leave_status !== "none" && (
                        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            Leave request: <span className="font-bold">{editing.cell.leave_status}</span>
                            {editing.cell.leave_reason ? ` - ${editing.cell.leave_reason}` : ""}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded text-sm font-bold text-gray-600 hover:bg-gray-100">Cancel</button>
                    <button onClick={() => onSave(form)} className="px-4 py-2 rounded text-sm font-bold text-white bg-[#1F4E79] hover:bg-[#163859] flex items-center gap-2">
                        <Save size={16} /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}

function TimeField({ label, value, onChange }) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{label}</label>
            <input type="time" value={value || ""} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400">
            <Clock size={42} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">{text}</p>
        </div>
    );
}
