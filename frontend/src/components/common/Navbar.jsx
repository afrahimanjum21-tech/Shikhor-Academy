import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";
import { Menu, X } from "lucide-react";

// লোগো
const LOGO_URL = "https://lh3.googleusercontent.com/d/12u2xImQMsoc7NnZZicOb9w3K2tefQW_m";

export default function Navbar() {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white shadow-sm sticky top-0 z-50 font-sans border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4">
                {/* হাইট কমানো হয়েছে h-16 তে */}
                <div className="flex justify-between items-center h-16"> 
                    
                    {/* Logo Section */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <img 
                            src={LOGO_URL} 
                            alt="Uttoron Logo" 
                            className="h-10 w-10 object-contain" // লোগো সাইজ অ্যাডজাস্ট করা হয়েছে
                        />
                        <span 
                            className="text-xl md:text-2xl font-bold transition text-[#1F4F78] group-hover:opacity-80"
                            style={{ fontFamily: '"Tiro Bangla", serif' }}
                        >
                            উত্তরণ কোচিং সেন্টার
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-6 items-center">
                        {["Home", "Courses", "Faculty", "Gallery", "Notices", "Contact"].map((item) => (
                            <Link 
                                key={item}
                                to={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                                className="text-gray-600 hover:text-[#1F4F78] font-medium transition text-sm uppercase tracking-wide hover:underline underline-offset-4"
                            >
                                {item}
                            </Link>
                        ))}
                        
                        {user ? (
                            <div className="flex gap-4">
                                <Link to="/admin/dashboard" className="bg-[#1F4F78] text-white px-5 py-2 rounded-md font-bold hover:opacity-90 transition shadow-sm text-xs uppercase">
                                    DASHBOARD
                                </Link>
                            </div>
                        ) : (
                            <Link to="/login" className="text-[#1F4F78] font-bold border border-[#1F4F78] px-5 py-2 rounded-md hover:bg-[#1F4F78] hover:text-white transition text-xs uppercase">
                                LOGIN
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button onClick={() => setIsOpen(!isOpen)} style={{ color: '#1F4F78' }} className="p-1">
                            {isOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isOpen && (
                <div className="md:hidden bg-white border-t p-4 space-y-3 shadow-lg">
                    {["Home", "Courses", "Faculty", "Gallery", "Notices", "Contact"].map((item) => (
                        <Link 
                            key={item}
                            to={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                            className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-[#1F4F78] rounded-lg font-medium" 
                            onClick={() => setIsOpen(false)}
                        >
                            {item}
                        </Link>
                    ))}
                    {user ? (
                        <Link to="/admin/dashboard" className="block text-center bg-[#1F4F78] text-white py-3 rounded-lg font-bold" onClick={() => setIsOpen(false)}>Dashboard</Link>
                    ) : (
                        <Link to="/login" className="block text-center border border-[#1F4F78] text-[#1F4F78] py-3 rounded-lg font-bold hover:bg-[#1F4F78] hover:text-white" onClick={() => setIsOpen(false)}>Login</Link>
                    )}
                </div>
            )}
        </nav>
    );
}