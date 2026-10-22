import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import {
    Menu, X, Home, Info, BookOpen, Users, Image, Megaphone, Mail, LayoutDashboard, LogOut, Trophy
} from "lucide-react";
import { useConfirm } from "./ConfirmDialog";

import LOGO_IMAGE from "../../images/hero-background.jpg";

const navItems = ["Home", "About", "Courses", "Faculty", "Gallery", "Notices", "Success Stories", "Contact"];

const navIcons = {
    Home: Home,
    About: Info,
    Courses: BookOpen,
    Faculty: Users,
    Gallery: Image,
    Notices: Megaphone,
    "Success Stories": Trophy,
    Contact: Mail,
};

const navPath = (item) => (item === "Home" ? "/" : `/${item.toLowerCase().replace(/\s+/g, "-")}`);

// Detail routes that live outside a section's own path but belong to it.
const navExtraPrefixes = {
    Courses: ["/course/"],
};

const isNavItemActive = (item, pathname) => {
    const path = navPath(item);
    if (path === "/") return pathname === "/";
    return (
        pathname === path ||
        pathname.startsWith(`${path}/`) ||
        (navExtraPrefixes[item] || []).some((prefix) => pathname.startsWith(prefix))
    );
};

// §D/O: the public DASHBOARD button must route to the signed-in user's OWN
// panel, not always /admin/dashboard. Mirrors AppRoutes/Login role mapping;
// an unknown/missing role falls back safely to login.
const dashboardPath = (role) => {
    if (role === "admin" || role === "super_admin") return "/admin/dashboard";
    if (role === "teacher") return "/teacher/dashboard";
    if (role === "student") return "/student/dashboard";
    return "/login";
};

export default function Navbar() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const closeRef = useRef(null);
    const hamburgerRef = useRef(null);

    const confirm = useConfirm();

    const closeDrawer = () => setIsOpen(false);

    const handleLogout = async () => {
        const ok = await confirm({
            title: "Log out?",
            message: "Are you sure you want to log out?",
            confirmText: "Logout",
            cancelText: "Cancel",
            variant: "destructive",
        });
        if (!ok) return;
        logout();
        navigate('/login');
    };

    // Lock body scroll while the drawer is open
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === "Escape") closeDrawer(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen]);

    // Close on browser back
    useEffect(() => {
        if (!isOpen) return;
        const onPop = () => closeDrawer();
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, [isOpen]);

    // Always close the drawer when the route changes
    useEffect(() => {
        if (isOpen) setIsOpen(false);
    }, [location.pathname]);

    // Focus management
    useEffect(() => {
        if (isOpen && closeRef.current) {
            closeRef.current.focus();
        } else if (!isOpen && hamburgerRef.current) {
            hamburgerRef.current.focus();
        }
    }, [isOpen]);

    return (
        <nav className="bg-white shadow-sm sticky top-0 z-50 font-sans border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-12 sm:h-14">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 md:gap-3 group flex-shrink-0">
                        <img
                            src={LOGO_IMAGE}
                            alt="Shikhor Academy Logo"
                            className="h-7 w-7 md:h-8 md:w-8 object-contain"
                        />
                        <span
                            className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold transition text-[#1F4F78] group-hover:opacity-80 whitespace-nowrap"
                            style={{ fontFamily: '"Tiro Bangla", serif' }}
                        >
                            Shikhor Academy
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden lg:flex lg:space-x-5 xl:space-x-6 items-center">
                        {navItems.map((item) => {
                            const isActive = isNavItemActive(item, location.pathname);
                            return (
                                <Link
                                    key={item}
                                    to={navPath(item)}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`relative isolate whitespace-nowrap rounded-full text-xs font-medium uppercase tracking-wide transition-colors duration-200 before:absolute before:-inset-x-2 before:-inset-y-1.5 before:-z-10 before:rounded-full before:transition-colors before:duration-200 xl:text-sm ${
                                        isActive
                                            ? "font-bold text-[#1F4F78] before:bg-[#1F4F78]/10 before:ring-1 before:ring-inset before:ring-[#1F4F78]/20"
                                            : "text-gray-600 hover:text-[#1F4F78] before:bg-transparent hover:before:bg-[#1F4F78]/5"
                                    }`}
                                >
                                    {item}
                                </Link>
                            );
                        })}

                        {user ? (
                            <div className="flex gap-4">
                                <Link to={dashboardPath(user.role)} className="bg-[#1F4F78] text-white px-4 xl:px-5 py-2 rounded-md font-bold hover:opacity-90 transition shadow-sm text-[10px] xl:text-xs uppercase whitespace-nowrap">
                                    DASHBOARD
                                </Link>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                aria-current={location.pathname === "/login" ? "page" : undefined}
                                className={`font-bold border px-4 xl:px-5 py-2 rounded-md transition text-[10px] xl:text-xs uppercase whitespace-nowrap ${
                                    location.pathname === "/login"
                                        ? "bg-[#1F4F78] border-[#1F4F78] text-white shadow-sm"
                                        : "text-[#1F4F78] border-[#1F4F78] hover:bg-[#1F4F78] hover:text-white"
                                }`}
                            >
                                LOGIN
                            </Link>
                        )}
                    </div>

                    {/* Hamburger */}
                    <div className="lg:hidden flex items-center">
                        <button
                            ref={hamburgerRef}
                            onClick={() => setIsOpen(!isOpen)}
                            className="relative p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200/70 transition"
                            aria-label={isOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isOpen}
                            aria-controls="mobile-navigation-drawer"
                        >
                            {isOpen ? <X size={24} color="#1F4F78" /> : <Menu size={24} color="#1F4F78" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Side Drawer - always mounted, animated with CSS transitions */}
            <div
                className={`fixed inset-0 z-[70] lg:hidden ${isOpen ? "" : "pointer-events-none"}`}
                aria-hidden={!isOpen}
            >
                {/* Backdrop */}
                <div
                    onClick={closeDrawer}
                    className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-out ${isOpen ? "opacity-100" : "opacity-0"}`}
                    aria-hidden="true"
                />

                {/* Drawer Panel */}
                <div
                    id="mobile-navigation-drawer"
                    role="dialog"
                    aria-modal={isOpen || undefined}
                    aria-label="Navigation menu"
                    className={`absolute inset-y-0 right-0 w-[84vw] max-w-[380px] bg-white border-l border-gray-200 shadow-xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
                >
                    {/* Drawer Header */}
                    <div className="h-12 sm:h-14 flex items-center px-4 border-b border-gray-100 flex-shrink-0">
                        <Link to="/" onClick={closeDrawer} className="flex items-center gap-2.5 min-w-0">
                            <img
                                src={LOGO_IMAGE}
                                alt="Shikhor Academy Logo"
                                className="h-7 w-7 sm:h-8 sm:w-8 object-contain flex-shrink-0"
                            />
                            <span
                                className="font-bold text-sm sm:text-base text-[#1F4E79] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
                                style={{ fontFamily: '"Tiro Bangla", serif' }}
                            >
                                Shikhor Academy
                            </span>
                        </Link>
                        <button
                            ref={closeRef}
                            onClick={closeDrawer}
                            className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition active:bg-gray-200/70"
                            aria-label="Close menu"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 overflow-y-auto overscroll-contain py-4 px-2 space-y-0.5">
                        {navItems.map((item) => {
                            const to = navPath(item);
                            const isActive = isNavItemActive(item, location.pathname);
                            const Icon = navIcons[item];
                            return (
                                <Link
                                    key={item}
                                    to={to}
                                    onClick={closeDrawer}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm ${
                                        isActive
                                            ? "bg-[#1F4E79] text-white shadow-md"
                                            : "text-gray-500 hover:bg-gray-100 hover:text-[#1F4E79]"
                                    }`}
                                >
                                    <Icon size={18} className="flex-shrink-0" />
                                    <span className="flex-1 truncate">{item}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Auth Footer */}
                    <div className="flex-shrink-0 p-3 border-t border-gray-100 bg-gray-50/50 space-y-2">
                        {user ? (
                            <>
                                <Link
                                    to={dashboardPath(user.role)}
                                    onClick={closeDrawer}
                                    className="flex items-center justify-center gap-2.5 w-full px-3 py-3 rounded-lg bg-[#1F4E79] text-white font-medium text-sm shadow-md hover:bg-[#1a3d66] transition-colors active:scale-[0.98]"
                                >
                                    <LayoutDashboard size={18} /> Dashboard
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center gap-2.5 w-full px-3 py-3 rounded-lg border border-red-200 bg-red-50/60 text-red-600 font-medium text-sm hover:bg-red-100/70 transition-colors active:scale-[0.98]"
                                >
                                    <LogOut size={18} /> Logout
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                onClick={closeDrawer}
                                className="flex items-center justify-center gap-2.5 w-full px-3 py-3 rounded-lg bg-[#1F4E79] text-white font-medium text-sm shadow-md hover:bg-[#1a3d66] transition-colors active:scale-[0.98]"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}