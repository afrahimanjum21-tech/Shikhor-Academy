import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, Users, FileText, BookOpen, LogOut, Menu, X, Image as ImageIcon, Bell, Calendar, CalendarDays, Library, GraduationCap, Layers, Banknote, Settings, UserCog, Building2, Laptop, MessageSquare } from "lucide-react";
import { useState } from "react";
import FloatingUploadWidget from "../components/common/FloatingUploadWidget";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { useNotificationCounts } from "../context/NotificationContext";
import NotificationBadge from "../components/notifications/NotificationBadge";
import NotificationBell from "../components/notifications/NotificationBell";
import HERO_IMAGE from "../images/hero-background.jpg";

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const { counts } = useNotificationCounts();

    const handleLogout = () => { logout(); navigate('/login'); };

    const navItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20}/> },
        { name: 'Students', path: '/admin/students', icon: <GraduationCap size={20}/> },
        { name: 'Admissions', path: '/admin/admissions', icon: <FileText size={20}/>, count: (counts.pending_admissions || 0) + (counts.hold_admissions || 0) },
        { name: 'Courses', path: '/admin/courses', icon: <BookOpen size={20}/> },
        { name: 'Batches', path: '/admin/batches', icon: <Layers size={20}/> },
        { name: 'Staff', path: '/admin/staff', icon: <UserCog size={20}/> },
        { name: 'Routine', path: '/admin/routine', icon: <Calendar size={20}/> },
        { name: 'Calendar', path: '/admin/events', icon: <Calendar size={20}/> },
        { name: 'Attendance', path: '/admin/attendance', icon: <Calendar size={20}/> },
        { name: 'Leave Requests', path: '/admin/leave-requests', icon: <CalendarDays size={20}/>, count: counts.pending_leave_requests || 0 },
        { name: 'Exams', path: '/admin/exams', icon: <FileText size={20}/> },
        { name: 'Payments', path: '/admin/payments', icon: <Banknote size={20}/>, count: counts.pending_payments || 0 },
        { name: 'Payment Settings', path: '/admin/payment-settings', icon: <Settings size={20}/> },
        { name: 'Site Settings', path: '/admin/site-settings', icon: <Building2 size={20}/> },
        { name: 'Library', path: '/admin/library', icon: <Library size={20}/> },
        { name: 'Gallery', path: '/admin/gallery', icon: <ImageIcon size={20}/> },
        { name: 'E-Learning', path: '/admin/e-learning', icon: <Laptop size={20}/> },
        { name: 'Messages', path: '/admin/contact-messages', icon: <MessageSquare size={20}/>, count: counts.unread_messages || 0 },
        { name: 'Notices', path: '/admin/notices', icon: <Bell size={20}/> },
    ];

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
            {isSidebarOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>}

            <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col shadow-xl md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex-shrink-0`}>
                <div className="h-14 md:h-16 flex items-center px-4 md:px-6 border-b border-gray-100">
                    <Link to="/" className="flex items-center gap-2.5">
                        <img src={HERO_IMAGE} className="h-7 w-7 md:h-8 md:w-8 object-contain rounded" alt="Logo" />
                        <span className="font-bold text-base md:text-lg text-[#1F4E79] tracking-tight">Admin Panel</span>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
                </div>
                <nav className="flex-1 overflow-y-auto py-4 md:py-6 px-2 md:px-4 space-y-0.5 scrollbar-hide">
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-2.5 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-all duration-200 font-medium text-sm ${location.pathname === item.path ? 'bg-[#1F4E79] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-[#1F4E79]'}`}>
                            <span className="flex-shrink-0">{item.icon}</span>
                            <span className="flex-1 truncate">{item.name}</span>
                            <NotificationBadge count={item.count} />
                        </Link>
                    ))}
                </nav>
                <div className="p-3 md:p-4 border-t border-gray-100 bg-gray-50/50">
                    <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 md:px-4 py-2.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"><LogOut size={18} /> <span>Logout</span></button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
                <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-6 flex-shrink-0">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><Menu size={22} /></button>
                        <h2 className="text-sm md:text-lg font-semibold text-gray-800 truncate max-w-[140px] md:max-w-none">{navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}</h2>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <NotificationBell />
                        <div className="hidden xs:block text-right">
                            <p className="text-xs md:text-sm font-bold text-gray-800 truncate max-w-[100px] md:max-w-[160px]">{user?.name}</p>
                            <p className="text-[10px] md:text-xs text-gray-500">Admin</p>
                        </div>
                        <img src={HERO_IMAGE} alt="Uttoron" className="h-7 w-7 md:h-9 md:w-9 rounded-full object-cover border-2 border-gray-100" />
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-3 md:p-8 bg-[#F8FAFC]"><div className="max-w-6xl mx-auto"><ErrorBoundary><Outlet /></ErrorBoundary></div></main>
            </div>

            <FloatingUploadWidget />
        </div>
    );
}
