import { useEffect, useState } from "react";
import api from "../services/api";
import { FileText, Download, Search, Link as LinkIcon, ExternalLink, LogIn, BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Library({ requireAuth = false }) {
    const { user, token } = useAuth();
    const [materials, setMaterials] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        api.get('/public/materials').then(res => setMaterials(res.data));
    }, []);

    const filtered = materials.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const getUrl = (path) => `http://localhost:8000/${path}`;

    // requireAuth=true মানে এটি পাবলিক পেজ, লগইন প্রম্পট দেখাতে হবে
    const isPublicLockedPage = requireAuth;
    const isLoggedIn = !!token;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="min-h-screen bg-[#F8FAFC] py-12 px-4 font-sans"
        >
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-[#1F4E79] mb-2">Digital Library</h1>
                    <p className="text-gray-600">Download study notes and lecture sheets.</p>
                </div>

                {/* লগইন প্রম্পট - শুধু পাবলিক পেজে ও লগইন না থাকলে */}
                {isPublicLockedPage && !isLoggedIn && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-[#1F4E79] to-[#2a6ba8] rounded-2xl p-8 mb-10 text-white shadow-lg"
                    >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl">
                                    <BookOpen size={40} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Student Access Required</h3>
                                    <p className="text-white/80 text-sm">Please log in as a student to access the full library with all study materials.</p>
                                </div>
                            </div>
                            <Link
                                to="/login"
                                className="flex items-center gap-2 bg-white text-[#1F4E79] px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition shadow-md whitespace-nowrap"
                            >
                                <LogIn size={20} /> Student Login <ArrowRight size={18} />
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* গেস্ট - ব্লার প্রিভিউ */}
                {isPublicLockedPage && !isLoggedIn ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.slice(0, 6).map((item, idx) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ scale: 1.02 }}
                                className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-[#1F4E79] transition group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 backdrop-blur-[3px] bg-white/40 z-10 flex items-center justify-center">
                                    <Link
                                        to="/login"
                                        className="bg-[#1F4E79] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-[#163a5c] transition shadow-md"
                                    >
                                        <LogIn size={16} className="inline mr-1" /> Login to Access
                                    </Link>
                                </div>
                                <div className="flex items-start gap-4 opacity-60">
                                    <div className={`p-3 rounded-lg ${item.type === 'link' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-[#1F4E79]'}`}>
                                        {item.type === 'link' ? <LinkIcon size={24}/> : <FileText size={24}/>}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 line-clamp-2 mb-1">{item.title}</h3>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">
                                            {item.type === 'link' ? 'Link' : `${item.file_type} File`}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* লগইন করা থাকলে - সম্পূর্ণ তালিকা */}
                        <div className="relative max-w-md mx-auto mb-10">
                            <input
                                type="text" placeholder="Search materials..."
                                className="w-full border border-gray-300 p-3 pl-10 rounded-full shadow-sm focus:outline-none focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] transition"
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ scale: 1.02 }}
                                    className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-[#1F4E79] transition group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-lg transition-colors ${item.type === 'link' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-[#1F4E79]'}`}>
                                            {item.type === 'link' ? <LinkIcon size={24}/> : <FileText size={24}/>}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 line-clamp-2 mb-1 group-hover:text-[#1F4E79] transition">{item.title}</h3>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">
                                                {item.type === 'link' ? 'Link' : `${item.file_type} File`}
                                            </p>

                                            {item.type === 'file' ? (
                                                <a href={getUrl(item.file_path)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#1F4E79] hover:underline">
                                                    <Download size={16} /> Download
                                                </a>
                                            ) : (
                                                <a href={item.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:underline">
                                                    <ExternalLink size={16} /> Open Link
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
}
