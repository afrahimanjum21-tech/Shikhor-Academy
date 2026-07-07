import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, CalendarCheck, CalendarX, Clock, CheckCircle, XCircle, AlertCircle, BarChart3 } from "lucide-react";

export default function StudentAttendance() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/admin/student/${id}/attendance`);
                setData(res.data);
            } catch (err) {
                console.error(err);
                alert("Failed to load attendance data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-gray-500">Loading attendance data...</div>;
    if (!data) return <div className="p-10 text-center text-gray-500">No data found.</div>;

    const { student, records, summary, monthly_stats } = data;

    const filteredRecords = filterStatus === 'all'
        ? records
        : records.filter(r => r.status === filterStatus);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'present': return { icon: <CheckCircle size={14} />, label: 'Present', color: 'bg-green-100 text-green-700 border-green-200' };
            case 'absent': return { icon: <XCircle size={14} />, label: 'Absent', color: 'bg-red-100 text-red-700 border-red-200' };
            case 'late': return { icon: <AlertCircle size={14} />, label: 'Late', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
            default: return { icon: <AlertCircle size={14} />, label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' };
        }
    };

    const statusCounts = [
        { key: 'all', label: 'All', count: records.length, icon: <BarChart3 size={16} />, color: 'bg-gray-100 text-gray-700' },
        { key: 'present', label: 'Present', count: summary.present, icon: <CalendarCheck size={16} />, color: 'bg-green-100 text-green-700' },
        { key: 'absent', label: 'Absent', count: summary.absent, icon: <CalendarX size={16} />, color: 'bg-red-100 text-red-700' },
        { key: 'late', label: 'Late', count: summary.late, icon: <Clock size={16} />, color: 'bg-yellow-100 text-yellow-700' },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10 px-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
                <button onClick={() => navigate(`/admin/students/${id}/profile`)} className="flex items-center gap-2 text-gray-600 hover:text-[#1F4E79] font-bold">
                    <ArrowLeft size={20}/> Back to Profile
                </button>
                <h1 className="text-lg font-bold text-[#1F4E79]">Attendance History</h1>
            </div>

            {/* Student Header */}
            <div className="bg-white p-5 rounded-xl shadow border border-gray-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1F4E79] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {student?.user?.name?.charAt(0) || 'S'}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{student?.user?.name}</h2>
                    <p className="text-sm text-gray-500">ID: {student?.student_id_card_no || 'N/A'}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <CalendarCheck className="mx-auto text-[#1F4E79] mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">{summary.total_classes}</p>
                    <p className="text-xs text-gray-500 font-medium">Total Classes</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <CheckCircle className="mx-auto text-green-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                    <p className="text-xs text-gray-500 font-medium">Present</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <XCircle className="mx-auto text-red-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                    <p className="text-xs text-gray-500 font-medium">Absent</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <BarChart3 className="mx-auto text-blue-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">{summary.percentage}%</p>
                    <p className="text-xs text-gray-500 font-medium">Attendance Rate</p>
                </div>
            </div>

            {/* Monthly Attendance Chart */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-[#1F4E79]">Monthly Attendance</h3>
                </div>
                {Object.keys(monthly_stats).length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <CalendarCheck size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-lg font-medium">No attendance records found</p>
                    </div>
                ) : (
                    <div className="p-5 space-y-3">
                        {Object.entries(monthly_stats).map(([month, stats]) => (
                            <div key={month} className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600 w-32 flex-shrink-0">{month}</span>
                                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-green-500" style={{ width: `${stats.percentage}%` }} title={`Present: ${stats.present}`}></div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-xs text-green-600 font-medium">{stats.present}/{stats.total}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${stats.percentage >= 75 ? 'bg-green-100 text-green-700' : stats.percentage >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                        {stats.percentage}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
                {statusCounts.map(s => (
                    <button key={s.key} onClick={() => setFilterStatus(s.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border transition ${filterStatus === s.key ? s.color + ' ring-2 ring-offset-1 ring-gray-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                        {s.icon} {s.label} ({s.count})
                    </button>
                ))}
            </div>

            {/* Records Table */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
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
                                                    {badge.icon} {badge.label}
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
