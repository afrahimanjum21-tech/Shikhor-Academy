import { Facebook, Twitter, Youtube, MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white pt-12 pb-6">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-700 pb-8">
                    
                    {/* Brand Section */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                            <span>🎓</span> Uttoron
                        </h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Empowering students to achieve their academic goals through excellence in education, discipline, and expert mentorship.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-bold mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/" className="hover:text-white transition">Home</Link></li>
                            <li><Link to="/about" className="hover:text-white transition">About Us</Link></li>
                            <li><Link to="/courses" className="hover:text-white transition">Our Courses</Link></li>
                            <li><Link to="/notices" className="hover:text-white transition">Notices</Link></li>
                            <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-lg font-bold mb-4">Contact Us</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li className="flex items-start gap-3">
                                <MapPin size={18} className="text-blue-500 mt-1" />
                                <span>Mirpur-10, Dhaka-1216, Bangladesh</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone size={18} className="text-blue-500" />
                                <span>+880 1700-000000</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail size={18} className="text-blue-500" />
                                <span>info@uttoron.com</span>
                            </li>
                        </ul>
                        <div className="flex gap-4 mt-6">
                            <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-blue-600 transition"><Facebook size={18} /></a>
                            <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-red-600 transition"><Youtube size={18} /></a>
                            <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-blue-400 transition"><Twitter size={18} /></a>
                        </div>
                    </div>
                </div>

                <div className="text-center text-gray-500 text-sm pt-6">
                    &copy; {new Date().getFullYear()} Uttoron Coaching Center. All rights reserved.
                </div>
            </div>
        </footer>
    );
}