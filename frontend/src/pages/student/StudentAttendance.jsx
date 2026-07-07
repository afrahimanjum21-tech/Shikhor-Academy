import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { CalendarCheck, Clock, Loader2, Send } from "lucide-react";

export default function StudentAttendance() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, leave: 0, percentage: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const courseId = useMemo(() => {
        const profile = user?.student_profile;
        return profile?.batch?.course?.id || profile?.admission?.course?.id || "";
    }, [user]);

    const [form, setForm] = useState({
        course_id: "",
        date: new Date().toISOString().slice(0, 10),
        session: "morning",
        punch_out_at: "",
        reason: "",
    });

    useEffect(() => {
        setForm((prev) => ({ ...prev, course_id: courseId }));
    }, [courseId]);

    useEffect(() => {
        api.get("/student/attendance/stats")
            .then((res) => setStats(res.data))
            .finally(() => setLoading(false));
    }, []);

    const submitLeave = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const { data } = await api.post("/student/attendance/leave-request", form);
            setMessage(data.message || "Leave request submitted");
            setForm((prev) => ({ ...prev, punch_out_at: "", reason: "" }));
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit leave request");
        } finally {
            setSaving(false);
        }
    };

    const punch = async (action, session) => {
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const { data } = await api.post(`/student/attendance/${action}`, {
                course_id: courseId,
                session,
            });
            setMessage(data.message || "Attendance recorded");
            const statsRes = await api.get("/student/attendance/stats");
            setStats(statsRes.data);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to record attendance");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-center text-[#1F4E79] flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Loading attendance...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                    <CalendarCheck size={26} /> Attendance
                </h1>
                <p className="text-sm text-gray-500 mt-1">Morning and evening attendance summary with approved leave count.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Stat label="Present" value={stats.present} tone="text-green-700" />
                <Stat label="Absent" value={stats.absent} tone="text-red-700" />
                <Stat label="Late" value={stats.late} tone="text-yellow-700" />
                <Stat label="Approved Leave" value={stats.leave} tone="text-purple-700" />
                <Stat label="Attendance" value={`${stats.percentage}%`} tone="text-[#1F4E79]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["morning", "evening"].map((session) => (
                    <div key={session} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                        <h2 className="font-bold text-gray-800 capitalize">{session} Session</h2>
                        <p className="text-sm text-gray-500 mt-1">Record punch in and punch out for this session.</p>
                        <div className="flex gap-3 mt-4">
                            <button type="button" disabled={saving || !courseId} onClick={() => punch("punch-in", session)} className="flex-1 rounded bg-green-600 text-white px-4 py-2.5 text-sm font-bold disabled:opacity-60">
                                Punch In
                            </button>
                            <button type="button" disabled={saving || !courseId} onClick={() => punch("punch-out", session)} className="flex-1 rounded bg-[#1F4E79] text-white px-4 py-2.5 text-sm font-bold disabled:opacity-60">
                                Punch Out
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={submitLeave} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
                <div>
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <Clock size={18} /> Early Leave Request
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Submit this when you need to punch out early. Admin approval is required before it counts as leave.</p>
                </div>

                {message && <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
                {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Date" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Session</label>
                        <select value={form.session} onChange={(event) => setForm({ ...form, session: event.target.value })} className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm bg-white">
                            <option value="morning">Morning</option>
                            <option value="evening">Evening</option>
                        </select>
                    </div>
                    <Field label="Punch Out Time" type="time" value={form.punch_out_at} onChange={(value) => setForm({ ...form, punch_out_at: value })} />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Reason</label>
                    <textarea required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} rows="3" className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm" />
                </div>

                <button disabled={saving || !form.course_id} className="rounded bg-[#1F4E79] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#163859] disabled:opacity-60 flex items-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Submit Request
                </button>
            </form>
        </div>
    );
}

function Stat({ label, value, tone }) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${tone}`}>{value}</p>
        </div>
    );
}

function Field({ label, type, value, onChange }) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{label}</label>
            <input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
    );
}
