import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { AlertCircle, BookOpen, Calendar, CheckCircle, Clock, Loader2, TrendingUp, Video } from "lucide-react";

const money = (value) => `BDT ${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;

export default function StudentDashboard() {
    const { user } = useAuth();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/student/dashboard")
            .then((res) => {
                setDashboard(res.data);
                setError("");
            })
            .catch((err) => setError(err.response?.data?.message || "Unable to load dashboard"))
            .finally(() => setLoading(false));
    }, []);

    const attendance = dashboard?.attendance || { total_classes: 0, present: 0, percentage: 0 };
    const payments = dashboard?.payments || { total_due: 0, due_months: [], pending_count: 0 };
    const student = dashboard?.student || {};
    const upcoming = dashboard?.upcoming || [];
    const results = dashboard?.recent_results || [];

    const StatCard = ({ title, value, subtext, icon: Icon, colorClass, to }) => {
        const content = (
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-200 h-full">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
                        <h3 className="text-2xl font-bold text-[#1F4E79] mt-1">{value}</h3>
                    </div>
                    <div className={`p-2 rounded-md ${colorClass}`}>
                        <Icon size={20} />
                    </div>
                </div>
                <p className="text-xs text-gray-500">{subtext}</p>
            </div>
        );

        return to ? <Link to={to}>{content}</Link> : content;
    };

    if (loading) {
        return (
            <div className="p-10 text-center text-[#1F4E79] flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79]">Welcome, {user?.name}!</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {student.course || "Course not assigned"}{student.batch ? ` - ${student.batch}` : ""}
                    </p>
                </div>
                <div className="flex items-center gap-3 text-left md:text-right">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Student ID</p>
                        <p className="text-lg font-mono font-bold text-[#1F4E79]">{student.card_no || "---"}</p>
                    </div>
                    {student.batch_class_link && (
                        <a href={student.batch_class_link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1F4E79] text-white text-xs font-bold hover:bg-[#163859] transition shadow">
                            <Video size={14} /> Join Class
                        </a>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance</p>
                            <h3 className="text-3xl font-bold text-[#1F4E79] mt-1">{attendance.percentage}%</h3>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-md text-[#1F4E79]">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                        <div
                            className="bg-[#1F4E79] h-1.5 rounded-full"
                            style={{ width: `${attendance.percentage}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                        <span className="font-bold text-gray-700">{attendance.present}</span> attended out of {attendance.total_classes ?? attendance.total ?? 0} days
                    </p>
                </div>

                <StatCard
                    title="Current Status"
                    value={payments.total_due > 0 ? "Dues Pending" : "Active"}
                    subtext={payments.pending_count > 0 ? `${payments.pending_count} payment awaiting verification` : "Academic account is active"}
                    icon={payments.total_due > 0 ? AlertCircle : CheckCircle}
                    colorClass={payments.total_due > 0 ? "text-orange-600 bg-orange-100" : "text-green-600 bg-green-100"}
                    to="/student/fees"
                />

                <StatCard
                    title="Due Fees"
                    value={payments.total_due > 0 ? money(payments.total_due) : "Clear"}
                    subtext={payments.due_months?.length ? `${payments.due_months.length} month(s) outstanding` : "No pending dues"}
                    icon={TrendingUp}
                    colorClass="text-orange-600 bg-orange-100"
                    to="/student/fees"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-[#1F4E79]">Upcoming</h3>
                        <Link to="/student/calendar" className="text-sm font-bold text-[#1F4E79] hover:underline">Calendar</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {upcoming.map((item) => (
                            <div key={item.id} className="p-4 flex items-start gap-3">
                                <div className="mt-1 rounded bg-blue-50 p-2 text-[#1F4E79]">
                                    {item.type === "exam" ? <BookOpen size={18} /> : <Calendar size={18} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-bold text-gray-800">{item.title}</h4>
                                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">
                                            {item.type}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">{new Date(item.date).toDateString()}</p>
                                    {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
                                </div>
                            </div>
                        ))}
                        {upcoming.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                <Calendar className="mx-auto mb-2 opacity-50" size={32} />
                                No upcoming exams or events scheduled.
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-[#1F4E79]">Recent Results</h3>
                        <Link to="/student/results" className="text-sm font-bold text-[#1F4E79] hover:underline">All</Link>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {results.map((result) => (
                            <div key={result.id} className="p-4">
                                <p className="font-bold text-gray-800">{result.exam?.name || "Exam"}</p>
                                <p className="text-xs text-gray-500">{result.exam?.course?.title || "Course"}</p>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-sm text-gray-600">GPA {result.gpa != null ? result.gpa : "-"}</span>
                                    <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-[#1F4E79]">{result.grade || "-"}</span>
                                </div>
                            </div>
                        ))}
                        {results.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No published results yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
