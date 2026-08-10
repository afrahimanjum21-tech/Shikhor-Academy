import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";
import { useConfirm } from "./ConfirmDialog";
import InstallAppButton from "./InstallAppButton";

import LOGO_IMAGE from "../../images/hero-background.jpg";

const navItems = ["Home", "About", "Courses", "Faculty", "Gallery", "Notices", "Contact"];

const stagger = {
    animate: {
        transition: { staggerChildren: 0.07, delayChildren: 0.1 },
    },
};

const fadeIn = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export default function Navbar() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const confirm = useConfirm();

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

    return (
        <nav className="bg-white shadow-sm sticky top-0 z-50 font-sans border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 md:gap-3 group flex-shrink-0">
                        <img
                            src={LOGO_IMAGE}
                            alt="Uttoron Logo"
                            className="h-8 w-8 md:h-10 md:w-10 object-contain"
                        />
                        <span
                            className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold transition text-[#1F4F78] group-hover:opacity-80 whitespace-nowrap"
                            style={{ fontFamily: '"Tiro Bangla", serif' }}
                        >
                            উত্তরণ কোচিং সেন্টার
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden lg:flex lg:space-x-5 xl:space-x-6 items-center">
                        {navItems.map((item) => (
                            <Link
                                key={item}
                                to={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                                className="text-gray-600 hover:text-[#1F4F78] font-medium transition text-xs xl:text-sm uppercase tracking-wide hover:underline underline-offset-4 whitespace-nowrap"
                            >
                                {item}
                            </Link>
                        ))}

                        {user ? (
                            <div className="flex gap-4 items-center">
                                <InstallAppButton variant="pill" />
                                <Link to="/admin/dashboard" className="bg-[#1F4F78] text-white px-4 xl:px-5 py-2 rounded-md font-bold hover:opacity-90 transition shadow-sm text-[10px] xl:text-xs uppercase whitespace-nowrap">
                                    DASHBOARD
                                </Link>
                            </div>
                        ) : (
                            <div className="flex gap-4 items-center">
                                <InstallAppButton variant="pill" />
                                <Link to="/login" className="text-[#1F4F78] font-bold border border-[#1F4F78] px-4 xl:px-5 py-2 rounded-md hover:bg-[#1F4F78] hover:text-white transition text-[10px] xl:text-xs uppercase whitespace-nowrap">
                                    LOGIN
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Hamburger */}
                    <div className="lg:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="relative p-2 rounded-lg hover:bg-gray-100 transition"
                            aria-label="Toggle menu"
                        >
                            <motion.div
                                animate={{ rotate: isOpen ? 90 : 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                {isOpen ? <X size={28} color="#1F4F78" /> : <Menu size={28} color="#1F4F78" />}
                            </motion.div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu Panel */}
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className="lg:hidden bg-white border-t border-gray-100 overflow-hidden shadow-xl relative z-50"
                    >
                        <motion.div
                            variants={stagger}
                            initial="initial"
                            animate="animate"
                            className="px-4 py-4 space-y-1"
                        >
                            {navItems.map((item) => (
                                <motion.div key={item} variants={fadeIn}>
                                    <Link
                                        to={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                                        onClick={() => setIsOpen(false)}
                                        className="block px-4 py-3 text-gray-700 hover:bg-[#1F4F78] hover:text-white rounded-lg font-medium transition-all duration-200"
                                    >
                                        {item}
                                    </Link>
                                </motion.div>
                            ))}

                            <motion.div variants={fadeIn} className="pt-2 space-y-2">
                                <InstallAppButton variant="pill" className="!w-full !justify-center" />
                                {user ? (
                                    <>
                                        <Link
                                            to="/admin/dashboard"
                                            onClick={() => setIsOpen(false)}
                                            className="block text-center bg-[#1F4F78] text-white py-3 rounded-lg font-bold hover:opacity-90 transition"
                                        >
                                            Dashboard
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full text-center border border-red-300 text-red-600 py-3 rounded-lg font-bold hover:bg-red-50 transition"
                                        >
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <Link
                                        to="/login"
                                        onClick={() => setIsOpen(false)}
                                        className="block text-center border border-[#1F4F78] text-[#1F4F78] py-3 rounded-lg font-bold hover:bg-[#1F4F78] hover:text-white transition"
                                    >
                                        Login
                                    </Link>
                                )}
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </nav>
    );
}
