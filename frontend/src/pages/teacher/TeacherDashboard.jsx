import { useEffect, useState } from "react";
import api from "../../services/api";
import { LayoutDashboard, Users, BookOpen, Calendar, FileText, CheckCircle, Bell, Upload } from "lucide-react";
import logger from '../../services/logger';

export default function TeacherDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const { data } = await api.get('/teacher/dashboard');
            setStats(data);
        } catch (error) {
            logger.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    const statCards = [
        { label: "Today's Classes", value: stats?.today_classes || 0, icon: <Calendar className="text-blue-600" />, color: "bg-blue-50" },
        { label: "Total Batches", value: stats?.total_batches || 0, icon: <BookOpen className="text-green-600" />, color: "bg-green-50" },
        { label: "Total Students", value: stats?.total_students || 0, icon: <Users className="text-purple-600" />, color: "bg-purple-50" },
        { label: "Upcoming Exams", value: stats?.upcoming_exams || 0, icon: <FileText className="text-orange-600" />, color: "bg-orange-50" },
        { label: "Pending Attendance", value: stats?.pending_attendance || 0, icon: <CheckCircle className="text-red-600" />, color: "bg-red-50" },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {statCards.map((stat, index) => (
                    <div key={index} className={`${stat.color} rounded-xl p-5 border border-gray-200`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                            </div>
                            <div className="p-3 bg-white rounded-lg shadow-sm">{stat.icon}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Assigned Batches */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Assigned Batches</h2>
                {stats?.assigned_batches?.length > 0 ? (
                    <div className="space-y-3">
                {stats.assigned_batches.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                            <p className="font-medium text-gray-800">{assignment.name}</p>
                            <p className="text-sm text-gray-500">{assignment.course?.title} - {assignment.subject}</p>
                        </div>
                        <span className="px-3 py-1 bg-[#1F4E79]/10 text-[#1F4E79] rounded-full text-xs font-medium">
                            {assignment.student_count || 0} Students
                        </span>
                    </div>
                ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">No batches assigned yet</p>
                )}
            </div>

            {/* Recent Notices */}
            {stats?.recent_notices?.length > 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Bell className="text-[#1F4E79]" /> Recent Notices
                    </h2>
                    <div className="space-y-3">
                        {stats.recent_notices.map((notice) => (
                            <div key={notice.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="font-medium text-gray-800">{notice.title}</p>
                                <p className="text-sm text-gray-500 mt-1">{notice.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Latest Materials */}
            {stats?.latest_materials?.length > 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Upload className="text-[#1F4E79]" /> Latest Materials
                    </h2>
                    <div className="space-y-3">
                        {stats.latest_materials.map((material) => (
                            <div key={material.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="font-medium text-gray-800">{material.title}</p>
                                <p className="text-sm text-gray-500 mt-1">{material.subject} - {material.Batch?.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
