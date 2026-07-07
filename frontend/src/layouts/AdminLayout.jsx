import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
// Banknote আইকন যোগ করা হয়েছে
import { LayoutDashboard, Users, FileText, BookOpen, LogOut, Menu, X, Image as ImageIcon, Bell, Calendar, Library, GraduationCap, Layers, Banknote, Settings } from "lucide-react";
import { useState } from "react";
import FloatingUploadWidget from "../components/common/FloatingUploadWidget";

const LOGO_URL = "https://lh3.googleusercontent.com/d/12u2xImQMsoc7NnZZicOb9w3K2tefQW_m";

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => { logout(); navigate('/login'); };

    const navItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20}/> },
        { name: 'Students', path: '/admin/students', icon: <GraduationCap size={20}/> },
        { name: 'Admissions', path: '/admin/admissions', icon: <FileText size={20}/> },
        { name: 'Courses', path: '/admin/courses', icon: <BookOpen size={20}/> },
        { name: 'Batches', path: '/admin/batches', icon: <Layers size={20}/> },
        { name: 'Faculty', path: '/admin/teachers', icon: <Users size={20}/> },
        { name: 'Routine', path: '/admin/routine', icon: <Calendar size={20}/> },
        { name: 'Calendar', path: '/admin/events', icon: <Calendar size={20}/> },
        { name: 'Attendance', path: '/admin/attendance', icon: <Calendar size={20}/> },
        { name: 'Exams', path: '/admin/exams', icon: <FileText size={20}/> },
        { name: 'Payments', path: '/admin/payments', icon: <Banknote size={20}/> }, // <--- নতুন মেনু
        { name: 'Payment Settings', path: '/admin/payment-settings', icon: <Settings size={20}/> },
        { name: 'Library', path: '/admin/library', icon: <Library size={20}/> },
        { name: 'Gallery', path: '/admin/gallery', icon: <ImageIcon size={20}/> },
        { name: 'Notices', path: '/admin/notices', icon: <Bell size={20}/> },
    ];

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
            {/* ... বাকি UI একই থাকবে ... */}
            {isSidebarOpen && <div className="fixed inset-0 bg-[#1F4E79]/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>}

            <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex-shrink-0`}>
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <img src={LOGO_URL} className="h-8 w-8 object-contain mr-3" alt="Logo" />
                    <span className="font-bold text-lg text-[#1F4E79] tracking-tight">Admin Panel</span>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto text-gray-500"><X size={20} /></button>
                </div>
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 font-medium text-sm ${location.pathname === item.path ? 'bg-[#1F4E79]/5 text-[#1F4E79] border-l-4 border-[#1F4E79]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#1F4E79]'}`}>
                            {item.icon} <span>{item.name}</span>
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"><LogOut size={18} /> Logout</button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500 hover:text-[#1F4E79]"><Menu size={24} /></button>
                        <h2 className="text-lg font-semibold text-gray-800 hidden sm:block">{navItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right"><p className="text-sm font-bold text-gray-800">{user?.name}</p><p className="text-xs text-gray-500">Admin</p></div>
                        <div className="h-9 w-9 bg-[#1F4E79] text-white rounded-full flex items-center justify-center font-bold text-sm">{user?.name?.charAt(0).toUpperCase()}</div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-4 md:p-8 bg-[#F8FAFC]"><div className="max-w-6xl mx-auto"><Outlet /></div></main>
            </div>

            {/* Floating Upload Widget - persists across all admin pages */}
            <FloatingUploadWidget />
        </div>
    );
}