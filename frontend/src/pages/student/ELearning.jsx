import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { motion, AnimatePresence } from "framer-motion";
import { Laptop, PlayCircle, Clock, BookOpen, Lock, X, ExternalLink, GraduationCap, ArrowLeft, Film } from "lucide-react";
import { useNotificationCounts } from "../../context/NotificationContext";
import logger from '../../services/logger';

export default function ELearning() {
    const { markViewed } = useNotificationCounts();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeVideo, setActiveVideo] = useState(null);   // lightbox-এ চলমান ভিডিও

    useEffect(() => { markViewed('e_learning'); }, [markViewed]);

    useEffect(() => {
        api.get('/public/e-learning')
            .then(res => setVideos(res.data))
            .catch(err => logger.error("Failed to load videos:", err))
            .finally(() => setLoading(false));
    }, []);

    /**
     * একটি ভিডিওর জন্য thumbnail URL বের করে।
     * ১. কাস্টম thumbnail থাকলে → সেটাই
     * ২. YouTube → hqdefault ইমেজ
     * ৩. Facebook / অন্যান্য → placeholder
     */
    const getThumb = (vid) => {
        if (vid.thumbnail_path) return buildAssetUrl(vid.thumbnail_path);
        if (vid.platform === 'youtube' && vid.video_id) {
            return `https://img.youtube.com/vi/${vid.video_id}/hqdefault.jpg`;
        }
        return null;
    };

    /**
     * Embed URL তৈরি করে (iframe src এর জন্য)।
     * ১. YouTube  → https://www.youtube.com/embed/ID?autoplay=1&rel=0
     * ২. Facebook → https://www.facebook.com/plugins/video.php?href=FULL_URL
     * ৩. অন্য → null (তখন বাইরের লিংকে নিয়ে যাবে)
     */
    const getEmbedUrl = (vid) => {
        if (vid.platform === 'youtube' && vid.video_id) {
            return `https://www.youtube.com/embed/${vid.video_id}?autoplay=1&rel=0&modestbranding=1`;
        }
        // Facebook ভিডিও embed করা যায় না (privacy restriction) → null রিটার্ন করবে,
        // fallback সেকশনে সুন্দর card দেখাবে + "Facebook এ দেখুন" বাটন
        return null;
    };

    const openVideo = (vid) => {
        if (isBlocked(vid)) return;        // লক করা ভিডিও চালু হবে না
        setActiveVideo(vid);
    };

    // Playable only when the admin hasn't locked it AND it's unlocked
    // for this student's batch/class/course.
    const isBlocked = (vid) => vid.is_locked || vid.is_unlocked === false;

    const accessHint = (vid) => {
        if (vid.access_type === 'batch') return vid.Batch?.name ? `For ${vid.Batch.name} only` : 'Batch locked';
        if (vid.access_type === 'class') return vid.class_name ? `For ${vid.class_name} class only` : 'Class locked';
        if (vid.access_type === 'course') return vid.Course?.title ? `For ${vid.Course.title} course only` : 'Course locked';
        return null;
    };

    const closeVideo = () => {
        setActiveVideo(null);
    };

    // C22: lock body scroll ONLY while the lightbox is open, and restore the
    // PREVIOUS overflow on close OR on unmount (e.g. navigating away with the
    // player still open) so the scroll-lock can never leak to other pages.
    useEffect(() => {
        if (!activeVideo) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [activeVideo]);

    // ESC দিয়ে বন্ধ
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') closeVideo(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                <Laptop size={28} /> E-Learning Platform
            </h1>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <BookOpen size={20} className="text-[#1F4E79]"/> Recorded Classes
                    </h3>
                    <span className="text-xs font-bold bg-[#1F4E79] text-white px-3 py-1 rounded-full">
                        {videos.length} Videos
                    </span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1,2,3].map(i => (
                            <div key={i} className="animate-pulse">
                                <div className="bg-gray-200 rounded-xl aspect-video mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        ))}
                    </div>
                ) : videos.length === 0 ? (
                    <p className="text-center text-gray-400 py-16">No videos available.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {videos.map((vid, idx) => (
                            <motion.div
                                key={vid.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => openVideo(vid)}
                                className={`group ${isBlocked(vid) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                {/* Thumbnail */}
                                <div className="relative rounded-xl overflow-hidden aspect-video mb-3 shadow-md group-hover:shadow-lg transition">
                                    {getThumb(vid) ? (
                                        <img
                                            src={getThumb(vid)}
                                            alt={vid.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-[#1877f2]/90 to-[#0c4a9e] flex flex-col items-center justify-center gap-2">
                                            {vid.platform === 'facebook' ? (
                                                <>
                                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                                    </div>
                                                    <span className="text-white/80 text-xs font-semibold">Facebook Video</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Film size={28} className="text-white/60" />
                                                    <span className="text-white/60 text-xs font-semibold">Video</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <div className={`absolute inset-0 flex items-center justify-center transition ${isBlocked(vid) ? 'bg-black/50' : 'bg-black/20 group-hover:bg-black/40'}`}>
                                        {isBlocked(vid) ? (
                                            <Lock size={32} className="text-gray-300" />
                                        ) : (
                                            <PlayCircle size={52} className="text-white opacity-90 group-hover:scale-110 transition" />
                                        )}
                                    </div>
                                    {isBlocked(vid) && (
                                        <span className="absolute top-2 right-2 bg-red-600/90 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                                            <Lock size={10}/> {vid.is_locked ? 'Locked' : 'Restricted'}
                                        </span>
                                    )}
                                    {vid.duration && (
                                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                            <Clock size={10}/> {vid.duration}
                                        </span>
                                    )}
                                    {/* Platform badge */}
                                    <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${vid.platform === 'youtube' ? 'bg-red-600 text-white' : vid.platform === 'facebook' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>
                                        {vid.platform}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="px-1">
                                    <h4 className={`font-bold text-lg mb-1 transition ${isBlocked(vid) ? 'text-gray-400' : 'text-gray-800 group-hover:text-[#1F4E79]'}`}>
                                        {vid.title}
                                    </h4>
                                    {isBlocked(vid) && accessHint(vid) && (
                                        <p className="text-xs text-red-500 font-medium mb-1.5">{accessHint(vid)}</p>
                                    )}
                                    {vid.description && (
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">{vid.description}</p>
                                    )}
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                        {vid.teacher && <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">by {vid.teacher}</span>}
                                        <span className={isBlocked(vid) ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                                            {vid.is_locked ? 'Locked' : !vid.is_unlocked ? 'Restricted' : 'Unlocked'}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ========== VIDEO PLAYER LIGHTBOX (Cinema Style) ========== */}
            <AnimatePresence>
                {activeVideo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
                        onClick={closeVideo}
                    >
                        {/* Top bar — close + back hint */}
                        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-4 bg-gradient-to-b from-black/80 to-transparent">
                            <span className="flex items-center gap-2 text-white/80 text-sm font-medium">
                                <ArrowLeft size={16}/> click here or (Esc) to go back
                            </span>
                            <button onClick={closeVideo} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition" title="Close">
                                <X size={22} />
                            </button>
                        </div>

                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 16 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="relative w-full max-w-5xl rounded-2xl overflow-hidden bg-[#0b1220] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* iframe Player */}
                            {getEmbedUrl(activeVideo) ? (
                                <div className="relative aspect-video bg-black">
                                    <iframe
                                        src={getEmbedUrl(activeVideo)}
                                        title={activeVideo.title}
                                        className="absolute inset-0 w-full h-full"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            ) : (
                                // Embed করা যায়নি → সুন্দর card + বাইরের লিংক
                                <div className={`aspect-video flex flex-col items-center justify-center text-white gap-5 px-6 text-center ${activeVideo.platform === 'facebook' ? 'bg-gradient-to-br from-[#1877f2]/20 via-[#0b1220] to-[#0b1220]' : 'bg-gradient-to-br from-[#1e3a5f] to-[#0b1220]'}`}>
                                    {/* Facebook এর জন্য branded icon */}
                                    {activeVideo.platform === 'facebook' ? (
                                        <div className="relative">
                                            <div className="w-20 h-20 rounded-full bg-[#1877f2]/20 flex items-center justify-center ring-2 ring-[#1877f2]/40">
                                                <svg width="36" height="36" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#1877f2] flex items-center justify-center shadow-lg">
                                                <PlayCircle size={14} fill="white" className="text-white"/>
                                            </div>
                                        </div>
                                    ) : (
                                        <PlayCircle size={56} className="text-white/40" />
                                    )}
                                    <div>
                                        <p className="text-lg font-medium max-w-md">
                                            {activeVideo.platform === 'facebook'
                                                ? 'This video cannot be played directly here due to Facebook restrictions.'
                                                : 'This video cannot be played directly here. Please click the button below to view it on the original platform.'}
                                        </p>
                                        <p className="text-sm text-white/50 mt-1">Click the button below to view it on the original platform.</p>
                                    </div>
                                    <a href={activeVideo.video_url} target="_blank" rel="noreferrer"
                                       className={`flex items-center gap-2.5 px-7 py-3 rounded-xl font-medium transition shadow-lg hover:scale-105 active:scale-95 ${activeVideo.platform === 'facebook' ? 'bg-[#1877f2] hover:bg-[#166fe5]' : 'bg-[#1F4E79] hover:bg-[#1a4068]'}`}>
                                        <ExternalLink size={18} />
                                        {activeVideo.platform === 'facebook' ? 'View on Facebook' : 'View Video'}
                                    </a>
                                </div>
                            )}

                            {/* Caption / details panel */}
                            <div className="px-6 py-5 bg-gradient-to-b from-[#0b1220] to-[#0e1628]">
                                {/* Meta row — platform + duration + locked */}
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${activeVideo.platform === 'youtube' ? 'bg-red-600/90 text-white' : activeVideo.platform === 'facebook' ? 'bg-blue-600/90 text-white' : 'bg-gray-600 text-white'}`}>
                                        {activeVideo.platform}
                                    </span>
                                    {activeVideo.duration && (
                                        <span className="flex items-center gap-1 text-xs text-white/60 bg-white/5 px-2.5 py-1 rounded-full">
                                            <Clock size={11}/> {activeVideo.duration}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-medium">
                                        <PlayCircle size={11}/> Now Playing
                                    </span>
                                </div>

                                {/* Title */}
                                <h4 className="text-white font-bold text-xl sm:text-2xl leading-tight">{activeVideo.title}</h4>

                                {/* Sub row — teacher */}
                                {(activeVideo.teacher || activeVideo.duration) && (
                                    <div className="flex flex-wrap items-center gap-4 mt-2.5 text-sm">
                                        {activeVideo.teacher && (
                                            <span className="flex items-center gap-1.5 text-white/70">
                                                <GraduationCap size={15} className="text-[#5b9bd5]"/> {activeVideo.teacher}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Description */}
                                {activeVideo.description && (
                                    <p className="text-white/65 text-sm leading-relaxed mt-3 border-t border-white/10 pt-3">{activeVideo.description}</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
