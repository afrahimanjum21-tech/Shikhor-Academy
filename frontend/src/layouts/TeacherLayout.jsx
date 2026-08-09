import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, User, CalendarDays, UserCheck, FileText, BookOpen, Upload, LogOut, Menu, X, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNotificationCounts } from "../context/NotificationContext";
import NotificationBadge from "../components/notifications/NotificationBadge";
import NotificationBell from "../components/notifications/NotificationBell";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { useConfirm } from "../components/common/ConfirmDialog";
import { buildAssetUrl } from "../services/config";
import LOGO_IMAGE from "../images/hero-background.jpg";

export default function TeacherLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const { counts } = useNotificationCounts();

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    const confirm = useConfirm();

    const handleLogout = async () => {
        const ok = await confirm({
            title: "Log out?",
            message: "Are you sure you want to log out of your teacher account?",
            confirmText: "Logout",
            cancelText: "Cancel",
            variant: "destructive",
        });
        if (!ok) return;
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/teacher/dashboard', icon: <LayoutDashboard size={20}/> },
        { name: 'My Profile', path: '/teacher/profile', icon: <User size={20}/> },
        { name: 'My Batches', path: '/teacher/batches', icon: <BookOpen size={20}/> },
        { name: 'My Students', path: '/teacher/students', icon: <UserCheck size={20}/> },
        { name: 'Attendance', path: '/teacher/attendance', icon: <CalendarDays size={20}/> },
        { name: 'Marks Entry', path: '/teacher/marks', icon: <Award size={20}/> },
        { name: 'Study Materials', path: '/teacher/materials', icon: <Upload size={20}/> },
        { name: 'Assignments', path: '/teacher/assignments', icon: <FileText size={20}/>, count: counts.pending_reviews || 0 },
    ];

    const rawPhotoPath = user?.profile_photo_url || user?.profile_photo_path;
    const photoUrl = buildAssetUrl(rawPhotoPath?.startsWith('http') ? rawPhotoPath : rawPhotoPath);

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
            {isSidebarOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

            <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col shadow-xl md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex-shrink-0`}>
                <div className="h-14 md:h-16 flex items-center px-4 md:px-6 border-b border-gray-100">
                    <img src={LOGO_IMAGE} className="h-7 w-7 md:h-8 md:w-8 object-contain rounded" alt="Logo" />
                    <span className="font-bold text-base md:text-lg text-[#1F4E79] tracking-tight ml-2.5">Teacher Portal</span>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
                </div>
                <nav className="flex-1 overflow-y-auto py-4 md:py-6 px-2 md:px-4 space-y-0.5 scrollbar-hide">
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className="block">
                            <motion.div whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }} className={`flex items-center gap-2.5 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-all duration-200 font-medium text-sm ${location.pathname === item.path ? 'bg-[#1F4E79] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-[#1F4E79]'}`}>
                                <span className="flex-shrink-0">{item.icon}</span>
                                <span className="flex-1 truncate">{item.name}</span>
                                <NotificationBadge count={item.count} />
                            </motion.div>
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
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><Menu size={22} /></motion.button>
                        <h2 className="text-sm md:text-lg font-semibold text-gray-800 truncate max-w-[140px] md:max-w-none">{navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}</h2>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <NotificationBell />
                        <div className="hidden xs:block text-right"><p className="text-xs md:text-sm font-bold text-gray-800 truncate max-w-[100px] md:max-w-[160px]">{user?.name}</p><p className="text-[10px] md:text-xs text-gray-500">Teacher</p></div>
                        <div className="h-7 w-7 md:h-10 md:w-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-200 flex-shrink-0">
                            {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-[#1F4E79] text-white font-bold text-xs md:text-sm">{user?.name?.charAt(0).toUpperCase()}</div>}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-3 md:p-8 bg-[#F8FAFC]">
                    <ErrorBoundary>
                        <div className="max-w-6xl mx-auto"><Outlet /></div>
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}
