import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, User, FileText, CalendarDays, Calendar, UserCheck, Banknote, Gamepad2, Monitor, Laptop, LogOut, Menu, X, Award, BookOpen, Image } from "lucide-react"; 
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOGO_URL = "https://lh3.googleusercontent.com/d/12u2xImQMsoc7NnZZicOb9w3K2tefQW_m";

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => { logout(); navigate('/login'); };

    const navItems = [
        { name: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={20}/> },
        { name: 'My Profile', path: '/student/profile', icon: <User size={20}/> },
        { name: 'Result & Progress', path: '/student/results', icon: <Award size={20}/> },
        { name: 'Class Routine', path: '/student/routine', icon: <CalendarDays size={20}/> },
        { name: 'Academic Calendar', path: '/student/calendar', icon: <Calendar size={20}/> },
        { name: 'Attendance', path: '/student/attendance-report', icon: <UserCheck size={20}/> },
        { name: 'Tuition Fees', path: '/student/fees', icon: <Banknote size={20}/> },
        { name: 'Extra Curricular', path: '/student/extra-curricular', icon: <Gamepad2 size={20}/> },
        { name: 'Attitude Reports', path: '/student/attitude', icon: <Monitor size={20}/> },
        { name: 'E-Learning', path: '/student/e-learning', icon: <Laptop size={20}/> },
        { name: 'Library', path: '/student/library', icon: <BookOpen size={20}/> },
        { name: 'Gallery', path: '/student/gallery', icon: <Image size={20}/> },
    ];

    // 🔥 ফিক্স: ইমেজ পাথ চেক (Optional Chaining)
    const rawPhotoPath = user?.profile_photo_url || user?.profile_photo_path || user?.student_profile?.admission?.photo_path;
    const photoUrl = rawPhotoPath?.startsWith('http') ? rawPhotoPath : (rawPhotoPath ? `http://localhost:8000/${rawPhotoPath}` : null);

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
            <AnimatePresence>
                {isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#1F4E79]/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
            </AnimatePresence>

            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex-shrink-0`}>
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <img src={LOGO_URL} className="h-8 w-8 object-contain mr-3" alt="Logo" />
                    <span className="font-bold text-lg text-[#1F4E79] tracking-tight">Student Portal</span>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto text-gray-500"><X size={20} /></button>
                </div>
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className="block">
                            <motion.div whileHover={{ x: 5 }} whileTap={{ scale: 0.95 }} className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 font-medium text-sm ${location.pathname === item.path ? 'bg-[#1F4E79]/10 text-[#1F4E79] border-l-4 border-[#1F4E79]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#1F4E79]'}`}>
                                {item.icon} <span>{item.name}</span>
                            </motion.div>
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"><LogOut size={18} /> Logout</button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <motion.button whileTap={{ scale: 0.8, rotate: 180 }} onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600 hover:text-[#1F4E79]"><Menu size={28} /></motion.button>
                        <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">{navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right"><p className="text-sm font-bold text-gray-800">{user?.name}</p><p className="text-xs text-gray-500">Student</p></div>
                        <div className="h-10 w-10 rounded-full border-2 border-white shadow-md overflow-hidden bg-gray-200">
                            {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-[#1F4E79] text-white font-bold text-sm">{user?.name?.charAt(0).toUpperCase()}</div>}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-4 md:p-8 bg-[#F8FAFC]">
                    <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-6xl mx-auto"><Outlet /></motion.div>
                </main>
            </div>
        </div>
    );
}
