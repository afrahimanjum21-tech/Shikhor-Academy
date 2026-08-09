import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, User, FileText, CalendarDays, Calendar, UserCheck, Banknote, Gamepad2, Monitor, Laptop, LogOut, Menu, X, Award, BookOpen, Image, ClipboardList } from "lucide-react"; 
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNotificationCounts } from "../context/NotificationContext";
import NotificationBadge from "../components/notifications/NotificationBadge";
import NotificationBell from "../components/notifications/NotificationBell";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { useConfirm } from "../components/common/ConfirmDialog";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import LOGO_IMAGE from "../images/hero-background.jpg";

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [notices, setNotices] = useState([]);
    const { counts } = useNotificationCounts();

    useEffect(() => {
        api.get('/public/notices')
            .then(({ data }) => setNotices(Array.isArray(data) ? data.slice(0, 8) : []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    const confirm = useConfirm();

    const handleLogout = async () => {
        const ok = await confirm({
            title: "Log out?",
            message: "Are you sure you want to log out of your student account?",
            confirmText: "Logout",
            cancelText: "Cancel",
            variant: "destructive",
        });
        if (!ok) return;
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={20}/> },
        { name: 'My Profile', path: '/student/profile', icon: <User size={20}/> },
        { name: 'Library', path: '/student/library', icon: <BookOpen size={20}/>, count: counts.new_materials || 0 },
        { name: 'Gallery', path: '/student/gallery', icon: <Image size={20}/>, count: counts.new_albums || 0 },
        { name: 'Result & Progress', path: '/student/results', icon: <Award size={20}/>, count: counts.new_exam_results || 0 },
        { name: 'Class Routine', path: '/student/routine', icon: <CalendarDays size={20}/>, count: counts.updated_routine || 0 },
        { name: 'Academic Calendar', path: '/student/calendar', icon: <Calendar size={20}/>, count: counts.new_events || 0 },
        { name: 'Attendance', path: '/student/attendance-report', icon: <UserCheck size={20}/>, count: counts.attendance_updates || 0 },
        { name: 'Tuition Fees', path: '/student/fees', icon: <Banknote size={20}/>, count: counts.pending_fees || 0 },
        { name: 'Extra Curricular', path: '/student/extra-curricular', icon: <Gamepad2 size={20}/>, count: counts.new_activities || 0 },
        { name: 'Attitude Reports', path: '/student/attitude', icon: <Monitor size={20}/>, count: counts.new_activities || 0 },
        { name: 'E-Learning', path: '/student/e-learning', icon: <Laptop size={20}/>, count: counts.new_videos || 0 },
        { name: 'Assignments', path: '/student/assignments', icon: <ClipboardList size={20}/>, count: counts.pending_assignments || 0 },
        { name: 'Assignment Results', path: '/student/assignment-results', icon: <Award size={20}/>, count: counts.recently_reviewed || 0 },
    ];

    const rawPhotoPath = user?.profile_photo_url || user?.profile_photo_path || user?.student_profile?.admission?.photo_path;
    const photoUrl = buildAssetUrl(rawPhotoPath);

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
            {isSidebarOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

            <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col shadow-xl md:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex-shrink-0`}>
                <div className="h-14 md:h-16 flex items-center px-4 md:px-6 border-b border-gray-100">
                    <img src={LOGO_IMAGE} className="h-7 w-7 md:h-8 md:w-8 object-contain rounded" alt="Logo" />
                    <span className="font-bold text-base md:text-lg text-[#1F4E79] tracking-tight ml-2.5">Student Portal</span>
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
                        <div className="hidden xs:block text-right"><p className="text-xs md:text-sm font-bold text-gray-800 truncate max-w-[100px] md:max-w-[160px]">{user?.name}</p><p className="text-[10px] md:text-xs text-gray-500">Student</p></div>
                        <div className="h-7 w-7 md:h-10 md:w-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-200 flex-shrink-0">
                            {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-[#1F4E79] text-white font-bold text-xs md:text-sm">{user?.name?.charAt(0).toUpperCase()}</div>}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-3 md:p-8 bg-[#F8FAFC]">
                    <div className="max-w-6xl mx-auto space-y-3 md:space-y-4">
                        <NoticeTicker notices={notices} />
                            <ErrorBoundary>
                                <Outlet />
                            </ErrorBoundary>
                    </div>
                </main>
            </div>
        </div>
    );
}

function NoticeTicker({ notices }) {
    if (!notices.length) return null;

    return (
        <div className="bg-gradient-to-r from-[#1F4E79] to-[#2a6ba8] rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center">
                <div className="bg-white/20 backdrop-blur-sm text-white px-2 py-2 flex-shrink-0 flex items-center border-r border-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                </div>
                <div className="relative overflow-hidden flex-1">
                    <div className="student-notice-marquee py-2 text-xs font-medium text-white/90">
                        {notices.map((notice) => (
                            <span key={notice.id} className="inline-flex items-center mx-4">
                                <span className="w-1 h-1 bg-amber-400 rounded-full mr-2 flex-shrink-0" />
                                <span className="font-semibold text-white">{notice.title}</span>
                                {notice.description ? <span className="text-white/60 ml-1">— {notice.description}</span> : null}
                            </span>
                        ))}
                    </div>
                    <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[#1F4E79] to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-[#1F4E79] to-transparent pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
