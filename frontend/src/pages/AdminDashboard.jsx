import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../services/api";
import { Users, BookOpen, AlertCircle, UserCheck } from "lucide-react";

export default function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ total_students: 0, total_teachers: 0, total_courses: 0, pending_admissions: 0 });

    useEffect(() => {
        api.get('/admin/stats').then(res => setStats(res.data)).catch(err => console.error(err));
    }, []);

    const cards = [
        { title: "Total Students", value: stats.total_students, icon: Users, color: "#1F4F78" },
        { title: "Faculty Members", value: stats.total_teachers, icon: UserCheck, color: "#0F766E" }, // Emerald Green
        { title: "Active Courses", value: stats.total_courses, icon: BookOpen, color: "#C2410C" },    // Orange
        { title: "Pending Request", value: stats.pending_admissions, icon: AlertCircle, color: "#B91C1C" } // Red
    ];

    return (
        <div>
            {/* Welcome Banner */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border-l-4 border-[#1F4F78] flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Overview</h1>
                    <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-[#1F4F78] bg-blue-50 px-4 py-1.5 rounded-full">
                        {new Date().toDateString()}
                    </p>
                </div>
            </div>

            {/* Stats Grid - Elegant Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-lg bg-gray-50" style={{ color: card.color }}>
                                <card.icon size={24} />
                            </div>
                            {card.title === "Pending Request" && card.value > 0 && (
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                            )}
                        </div>
                        <h3 className="text-3xl font-bold text-gray-800 mb-1">{card.value}</h3>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{card.title}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}