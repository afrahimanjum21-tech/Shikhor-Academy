import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { Users, GraduationCap, BookOpen, UserCheck, Clock, Wallet, AlertCircle, UserPlus, Layers, Presentation, Bell } from "lucide-react";
import RecentActivity from "../components/notifications/RecentActivity";
import logger from '../services/logger';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        total_students: 0, total_teachers: 0, total_faculty: 0,
        total_courses: 0, total_batches: 0, pending_admissions: 0, hold_admissions: 0,
        pending_payments: 0, pending_leave_requests: 0
    });

    useEffect(() => {
        api.get('/admin/stats').then(res => setStats(res.data)).catch(err => logger.error(err));
    }, []);

    const statCards = [
        {
            label: "Total Students", value: stats.total_students,
            icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50",
            link: "/admin/students"
        },
        {
            label: "Faculty Members", value: stats.total_faculty,
            icon: Users, color: "text-emerald-600", bg: "bg-emerald-50",
            link: "/admin/faculty"
        },
        {
            label: "Active Courses", value: stats.total_courses,
            icon: BookOpen, color: "text-orange-600", bg: "bg-orange-50",
            link: "/admin/courses"
        },
        {
            label: "Teachers", value: stats.total_teachers,
            icon: UserCheck, color: "text-purple-600", bg: "bg-purple-50",
            link: "/admin/teachers"
        },
        {
            label: "Pending Admissions", value: stats.pending_admissions,
            icon: Clock, color: "text-amber-600", bg: "bg-amber-50",
            link: "/admin/admissions", badge: stats.pending_admissions > 0
        },
        {
            label: "Pending Payments", value: stats.pending_payments,
            icon: Wallet, color: "text-rose-600", bg: "bg-rose-50",
            link: "/admin/payments", badge: stats.pending_payments > 0
        },
        {
            label: "Leave Requests", value: stats.pending_leave_requests,
            icon: AlertCircle, color: "text-sky-600", bg: "bg-sky-50",
            link: "/admin/leave-requests", badge: stats.pending_leave_requests > 0
        },
        {
            label: "Batches", value: stats.total_batches,
            icon: Layers, color: "text-indigo-600", bg: "bg-indigo-50",
            link: "/admin/batches"
        },
    ];

    const quickActions = [
        { label: "New Admission", icon: UserPlus, color: "bg-blue-600", link: "/admin/admissions" },
        { label: "Faculty Showcase", icon: Presentation, color: "bg-emerald-600", link: "/admin/faculty" },
        { label: "Post Notice", icon: Bell, color: "bg-amber-600", link: "/admin/notices" },
    ];

    const currentTime = new Date();
    const greeting = currentTime.getHours() < 12 ? "Good Morning" : currentTime.getHours() < 18 ? "Good Afternoon" : "Good Evening";

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1F4E79] via-[#1a3f63] to-[#163857] p-8 md:p-10">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{greeting}, {user?.name?.split(" ")[0] || "Admin"}</h1>
                        <p className="text-blue-200 mt-1.5 text-sm md:text-base">Here's what's happening at Uttoron Coaching Center today.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/10">
                            <p className="text-white/80 text-xs font-medium uppercase tracking-wider">{currentTime.toLocaleDateString('en-US', { weekday: 'long' })}</p>
                            <p className="text-white text-sm font-semibold">{currentTime.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
                {quickActions.map((action, i) => (
                    <Link key={i} to={action.link} className={`flex items-center gap-2 px-5 py-2.5 ${action.color} text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all shadow-sm`}>
                        <action.icon size={16} />
                        {action.label}
                    </Link>
                ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {statCards.map((card, i) => (
                    <Link key={i} to={card.link} className="group block bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2.5 rounded-xl ${card.bg} ${card.color}`}>
                                    <card.icon size={20} />
                                </div>
                                {card.badge && (
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inset-0 rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                )}
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                            <p className="text-sm text-gray-500 mt-1 font-medium">{card.label}</p>
                        </div>
                        <div className="h-1 bg-gradient-to-r from-transparent via-gray-100 to-transparent group-hover:via-[#1F4E79] transition-all"></div>
                    </Link>
                ))}
            </div>

            {/* Bottom Section: Pending Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <AlertCircle size={18} className="text-amber-500" />
                        Items Requiring Attention
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                            <div className="flex items-center gap-3">
                                <Clock size={16} className="text-amber-600" />
                                <span className="text-sm font-medium text-gray-700">Pending Admissions</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-amber-700">{stats.pending_admissions}</span>
                                <Link to="/admin/admissions" className="text-xs text-amber-600 hover:underline font-medium">Review</Link>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-100">
                            <div className="flex items-center gap-3">
                                <Wallet size={16} className="text-rose-600" />
                                <span className="text-sm font-medium text-gray-700">Pending Payments</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-rose-700">{stats.pending_payments}</span>
                                <Link to="/admin/payments" className="text-xs text-rose-600 hover:underline font-medium">View</Link>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-sky-50 border border-sky-100">
                            <div className="flex items-center gap-3">
                                <AlertCircle size={16} className="text-sky-600" />
                                <span className="text-sm font-medium text-gray-700">Leave Requests</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-sky-700">{stats.pending_leave_requests}</span>
                                <Link to="/admin/leave-requests" className="text-xs text-sky-600 hover:underline font-medium">Review</Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <GraduationCap size={18} className="text-[#1F4E79]" />
                        Quick Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50">
                            <p className="text-2xl font-bold text-blue-700">{stats.total_students}</p>
                            <p className="text-xs text-blue-600 font-medium mt-1">Total Students</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50">
                            <p className="text-2xl font-bold text-emerald-700">{stats.total_faculty + stats.total_teachers}</p>
                            <p className="text-xs text-emerald-600 font-medium mt-1">Total Staff</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50">
                            <p className="text-2xl font-bold text-orange-700">{stats.total_courses}</p>
                            <p className="text-xs text-orange-600 font-medium mt-1">Active Courses</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50">
                            <p className="text-2xl font-bold text-purple-700">{stats.hold_admissions || 0}</p>
                            <p className="text-xs text-purple-600 font-medium mt-1">On Hold</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <RecentActivity limit={5} />
        </div>
    );
}
