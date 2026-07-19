import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import { CalendarCheck, CalendarX, Clock, CheckCircle, XCircle, AlertCircle, BarChart3 } from "lucide-react";
import notify from "../../services/notification";
import logger from '../../services/logger';
 
export default function StudentAttendance() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/admin/student/${id}/attendance`);
                setData(res.data);
            } catch (err) {
                logger.error(err);
                notify.error("Failed to load attendance data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-gray-400">Loading attendance data...</div>;
    if (!data) return <div className="p-10 text-center text-gray-400">No data found.</div>;

    const { student, records, summary, monthly_stats } = data;

    const filteredRecords = filterStatus === 'all'
        ? records
        : records.filter(r => r.status === filterStatus);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'present': return { icon: CheckCircle, label: 'Present', color: 'bg-green-100 text-green-700 border-green-200' };
            case 'absent': return { icon: XCircle, label: 'Absent', color: 'bg-red-100 text-red-700 border-red-200' };
            case 'late': return { icon: AlertCircle, label: 'Late', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
            default: return { icon: AlertCircle, label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
        }
    };

    const statusCounts = [
        { key: 'all', label: 'All', count: records.length, icon: BarChart3, color: 'bg-gray-100 text-gray-700' },
        { key: 'present', label: 'Present', count: summary.present, icon: CalendarCheck, color: 'bg-green-100 text-green-700' },
        { key: 'absent', label: 'Absent', count: summary.absent, icon: CalendarX, color: 'bg-red-100 text-red-700' },
        { key: 'late', label: 'Late', count: summary.late, icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
    ];

    return (
        <div className="space-y-6">
            {/* Page title */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-6 md:px-7 py-4">
                <div>
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Attendance History</h2>
                    <p className="text-xs md:text-sm text-gray-400 mt-0.5">
                        {student?.user?.name} — ID: {student?.student_id_card_no || 'N/A'}
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <SummaryCard icon={CalendarCheck} label="Total Classes" value={summary.total_classes} color="text-[#1F4E79]" />
                <SummaryCard icon={CheckCircle} label="Present" value={summary.present} color="text-green-500" />
                <SummaryCard icon={XCircle} label="Absent" value={summary.absent} color="text-red-500" />
                <SummaryCard icon={BarChart3} label="Attendance Rate" value={`${summary.percentage}%`} color="text-blue-500" />
            </div>

            {/* Monthly Attendance Bars */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center gap-2.5">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center"><CalendarCheck size={16} className="text-[#1F4E79]" /></div>
                    <h3 className="text-sm md:text-base font-bold text-gray-900">Monthly Attendance</h3>
                </div>
                {Object.keys(monthly_stats).length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <CalendarCheck size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-base font-medium">No attendance records found</p>
                    </div>
                ) : (
                    <div className="px-6 md:px-7 py-5 md:py-6 space-y-4">
                        {Object.entries(monthly_stats).map(([month, stats]) => {
                            const barColor = stats.percentage >= 75
                                ? 'from-emerald-400 to-emerald-600'
                                : stats.percentage >= 50
                                    ? 'from-amber-400 to-amber-600'
                                    : 'from-rose-400 to-rose-600';
                            const statusLabel = stats.percentage >= 75 ? 'Good'
                                : stats.percentage >= 50 ? 'Average'
                                : 'Low';
                            const statusColor = stats.percentage >= 75
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : stats.percentage >= 50
                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                    : 'bg-rose-100 text-rose-700 border-rose-200';
                            return (
                                <div key={month} className="relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-800">{month}</span>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
                                        </div>
                                        <span className="text-lg font-bold text-gray-900">{stats.percentage}%</span>
                                    </div>
                                    <div className="relative h-7 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
                                            style={{ width: `${stats.percentage}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                                            <span className="text-xs font-bold text-white drop-shadow-sm" style={{ opacity: stats.percentage > 15 ? 1 : 0 }}>
                                                {stats.present} present
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium" style={{ opacity: stats.percentage > 85 ? 0 : 1 }}>
                                                {stats.total - stats.present} absent
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1.5">
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Present {stats.present}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Absent {stats.total - stats.present}
                                        </span>
                                        <span className="text-xs text-gray-400">Total {stats.total} classes</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
                {statusCounts.map(s => (
                    <button
                        key={s.key}
                        onClick={() => setFilterStatus(s.key)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border transition-all duration-200 ${
                            filterStatus === s.key
                                ? s.color + ' ring-2 ring-offset-1 ring-gray-300 shadow-sm'
                                : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                        }`}
                    >
                        <s.icon size={14} />
                        {s.label} ({s.count})
                    </button>
                ))}
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="p-4 text-left">#</th>
                                <th className="p-4 text-left">Date</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-left hidden md:table-cell">Course ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredRecords.length === 0 ? (
                                <tr><td colSpan="4" className="p-10 text-center text-gray-400">No records found for this filter.</td></tr>
                            ) : (
                                filteredRecords.map((record, idx) => {
                                    const badge = getStatusBadge(record.status);
                                    return (
                                        <tr key={record.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 text-gray-400 font-mono">{idx + 1}</td>
                                            <td className="p-4 font-medium text-gray-900">{record.date}</td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                                                    <badge.icon size={12} /> {badge.label}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-500 hidden md:table-cell">#{record.course_id}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 text-center transition-all duration-300 hover:shadow-lg hover:border-gray-200">
            <Icon size={22} className={`mx-auto mb-2 ${color || 'text-gray-400'}`} />
            <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
        </div>
    );
}
