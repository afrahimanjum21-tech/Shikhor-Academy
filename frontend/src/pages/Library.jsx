import { useEffect, useState } from "react";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import { FileText, Download, Search, Link as LinkIcon, ExternalLink, LogIn, BookOpen, ArrowRight, Lock } from "lucide-react";
import usePageMeta from "../hooks/usePageMeta";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotificationCounts } from "../context/NotificationContext";
import PageBackground from "../components/common/PageBackground";


export default function Library({ requireAuth = false }) {
    usePageMeta({
        title: "Library & Study Materials — Uttoron Coaching Centre",
        description: "Access study materials, notes and resources from Uttoron Coaching Centre's library.",
        path: "/library",
    });
    const { user, token } = useAuth();
    const { markViewed } = useNotificationCounts();
    const [materials, setMaterials] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        api.get('/public/materials').then(res => setMaterials(res.data)).catch(() => {});
    }, []);

    useEffect(() => { markViewed('library'); }, [markViewed]);

    const filtered = materials.filter(m => (m.title || "").toLowerCase().includes(searchTerm.toLowerCase()));
    // Cache-buster: guarantees the browser re-fetches the file, so the
    // Content-Disposition title always reaches the PDF viewer.
    const getUrl = (path) => {
        if (!path) return null;
        const separator = path.includes("?") ? "&" : "?";
        return buildAssetUrl(path) + separator + "v=" + encodeURIComponent(itemVersion(path));
    };
    const itemVersion = (path) => {
        const item = materials.find(m => m.file_path === path);
        return item ? (item.updatedAt || item.id || "1") : "1";
    };

    const isPublicLockedPage = requireAuth;
    const isLoggedIn = !!token;

    const accessHint = (item) => {
        if (item.access_type === 'batch') return item.Batch?.name ? `For ${item.Batch.name} only` : 'Batch locked';
        if (item.access_type === 'class') return item.class_name ? `For ${item.class_name} class only` : 'Class locked';
        if (item.access_type === 'course') return item.Course?.title ? `For ${item.Course.title} only` : 'Course locked';
        return 'Restricted';
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <PageBackground />
            {/* Page Header */}
            <div className="max-w-7xl mx-auto px-4 pt-12 pb-6 text-center">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1F4E79] mb-4">Digital Library</h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Download study notes and lecture sheets to enhance your learning.
                    </p>
                </motion.div>
            </div>

            <div className="max-w-7xl mx-auto px-4 pb-16">
                {/* Login Prompt - only for public locked page & not logged in */}
                {isPublicLockedPage && !isLoggedIn && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-[#1F4E79] to-[#2a6ba8] rounded-2xl p-8 mb-8 text-white shadow-lg"
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

                {/* Search Bar */}
                {(!isPublicLockedPage || isLoggedIn) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 max-w-md"
                    >
                        <div className="relative">
                            <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                            <input
                                type="text" placeholder="Search materials..."
                                className="w-full pl-6 pr-0 h-10 bg-transparent border-b border-gray-200 focus:border-[#1F4E79] transition-all text-sm outline-none"
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Guest - blurred preview */}
                {isPublicLockedPage && !isLoggedIn ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.slice(0, 6).map((item, idx) => (
                            <motion.div
                                key={item.id}
                                whileInView={{ opacity: 1, y: 0 }}
                                initial={{ opacity: 0, y: 20 }}
                                viewport={{ once: true, margin: "-40px" }}
                                transition={{ duration: 0.4, delay: Math.min(idx * 0.06, 0.4) }}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-[#1F4E79] transition group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 backdrop-blur-[3px] bg-white/40 z-10 flex items-center justify-center">
                                    <Link
                                        to="/login"
                                        className="bg-[#1F4E79] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-[#163a5c] transition shadow-md"
                                    >
                                        <LogIn size={16} className="inline mr-1" /> Login to Access
                                    </Link>
                                </div>
                                <div className="p-5 flex items-start gap-4 opacity-60">
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
                        {/* Full list for logged-in users */}
                        {filtered.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                                    <FileText size={36} className="text-gray-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-700">No materials found</h3>
                                <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filtered.map((item, idx) => (
                                    <motion.div
                                        key={item.id}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        initial={{ opacity: 0, y: 20 }}
                                        viewport={{ once: true, margin: "-40px" }}
                                        transition={{ duration: 0.4, delay: Math.min(idx * 0.06, 0.4) }}
                                        className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-[#1F4E79] transition group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-lg transition-colors ${item.type === 'link' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-[#1F4E79]'}`}>
                                                {item.type === 'link' ? <LinkIcon size={24}/> : <FileText size={24}/>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-800 line-clamp-2 mb-1 group-hover:text-[#1F4E79] transition">{item.title}</h3>
                                                <p className="text-xs text-gray-500 uppercase font-semibold">
                                                    {item.type === 'link' ? 'Link' : `${item.file_type} File`}
                                                </p>
                                                {item.Uploader && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Uploaded by <strong>{item.Uploader?.name}</strong>
                                                    </p>
                                                )}

                                                {item.type === 'file' ? (
                                                    item.is_unlocked ? (
                                                        <a href={getUrl(item.file_path)} target="_blank" rel="noreferrer"
                                                            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#1F4E79] hover:underline">
                                                            <Download size={16} /> Download
                                                        </a>
                                                    ) : (
                                                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-400">
                                                            <Lock size={14} /> {accessHint(item)}
                                                        </span>
                                                    )
                                                ) : (
                                                    item.is_unlocked ? (
                                                        <a href={item.url} target="_blank" rel="noreferrer"
                                                            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:underline">
                                                            <ExternalLink size={16} /> Open Link
                                                        </a>
                                                    ) : (
                                                        <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-400">
                                                            <Lock size={14} /> {accessHint(item)}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
