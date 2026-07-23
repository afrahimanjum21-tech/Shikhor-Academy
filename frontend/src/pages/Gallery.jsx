import { useEffect, useState, useRef, useCallback } from "react";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Image } from "lucide-react";
import { useNotificationCounts } from "../context/NotificationContext";
import PageBackground from "../components/common/PageBackground";


export default function Gallery() {
    const { markViewed } = useNotificationCounts();
    const [albums, setAlbums] = useState([]);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    useEffect(() => {
        api.get('/public/gallery').then(res => setAlbums(res.data)).catch(() => {});
    }, []);

    useEffect(() => { markViewed('gallery'); }, [markViewed]);

    const getUrl = (path) => path ? buildAssetUrl(path) : "https://placehold.co/600x400?text=No+Image";

    const openLightbox = (idx) => {
        setLightboxIndex(idx);
        setIsLightboxOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        setIsLightboxOpen(false);
        setLightboxIndex(null);
        document.body.style.overflow = '';
    };

    const goNext = useCallback(() => {
        if (!selectedAlbum?.images) return;
        setLightboxIndex(prev => (prev + 1) % selectedAlbum.images.length);
    }, [selectedAlbum]);

    const goPrev = useCallback(() => {
        if (!selectedAlbum?.images) return;
        setLightboxIndex(prev => (prev - 1 + selectedAlbum.images.length) % selectedAlbum.images.length);
    }, [selectedAlbum]);

    useEffect(() => {
        const handleKey = (e) => {
            if (!isLightboxOpen) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isLightboxOpen, goNext, goPrev]);

    const touchStartX = useRef(null);
    const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) goNext();
            else goPrev();
        }
        touchStartX.current = null;
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <PageBackground />
            {/* Page Header */}
            <div className="max-w-7xl mx-auto px-4 pt-12 pb-6 text-center">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1F4E79] mb-4">Campus Gallery</h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">Moments captured at Uttoron Coaching Center</p>
                </motion.div>
            </div>

            <div className="max-w-7xl mx-auto px-4 pb-16">
                <AnimatePresence mode="wait">
                    {!selectedAlbum ? (
                        <motion.div
                            key="albums"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                        >
                            {albums.map((album, idx) => (
                                <motion.div
                                    key={album.id}
                                    onClick={() => setSelectedAlbum(album)}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    initial={{ opacity: 0, y: 30 }}
                                    viewport={{ once: true, margin: "-40px" }}
                                    transition={{ duration: 0.45, delay: Math.min(idx * 0.08, 0.4) }}
                                    whileHover={{ scale: 1.03 }}
                                    className="cursor-pointer group relative rounded-xl overflow-hidden shadow-sm border border-gray-200 h-64"
                                >
                                    <img
                                        src={getUrl(album.thumbnail || album.images?.[0]?.image_path)}
                                        alt={album.name}
                                        className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-5">
                                        <h3 className="text-white text-xl font-bold">{album.name}</h3>
                                        {album.images && (
                                            <p className="text-white/80 text-sm mt-1">{album.images.length} photo{album.images.length !== 1 ? 's' : ''}</p>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="photos"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <button
                                onClick={() => setSelectedAlbum(null)}
                                className="mb-6 text-[#1F4E79] hover:underline font-bold flex items-center gap-2"
                            >
                                ← Back to Albums
                            </button>

                            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
                                {selectedAlbum.images.map((img, idx) => (
                                    <motion.div
                                        key={img.id}
                                        initial={{ opacity: 0, y: 40 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-30px" }}
                                        transition={{ duration: 0.5, ease: "easeOut", delay: (idx % 3) * 0.08 }}
                                        onClick={() => openLightbox(idx)}
                                        className="cursor-pointer group relative rounded-xl overflow-hidden shadow-sm border border-gray-200 mb-4 break-inside-avoid bg-gray-100"
                                    >
                                        <img
                                            src={getUrl(img.image_path)}
                                            className="w-full h-auto object-cover block transition duration-700 group-hover:scale-105"
                                            alt={img.caption || `Photo ${idx + 1}`}
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                            <div className="flex items-center justify-between gap-2 translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
                                                <span className="text-white text-sm font-medium drop-shadow line-clamp-2">
                                                    {img.caption || `Photo ${idx + 1}`}
                                                </span>
                                                <span className="shrink-0 text-white/90 bg-white/15 backdrop-blur-sm rounded-full p-1.5">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                        <span className="absolute top-3 left-3 text-[11px] font-mono text-white/90 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                            {idx + 1}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {isLightboxOpen && selectedAlbum?.images?.[lightboxIndex] && (
                    <motion.div
                        key="lightbox"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onClick={closeLightbox}
                    >
                        <button onClick={closeLightbox} className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors">
                            <X size={32} />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); goPrev(); }}
                            className="absolute left-3 sm:left-6 z-10 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 sm:p-3 rounded-full transition-all"
                        >
                            <ChevronLeft size={28} />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); goNext(); }}
                            className="absolute right-3 sm:right-6 z-10 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 sm:p-3 rounded-full transition-all"
                        >
                            <ChevronRight size={28} />
                        </button>

                        <AnimatePresence mode="wait">
                            <motion.img
                                key={lightboxIndex}
                                src={getUrl(selectedAlbum.images[lightboxIndex].image_path)}
                                alt=""
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.35, ease: "easeInOut" }}
                                className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </AnimatePresence>

                        {selectedAlbum.images[lightboxIndex].caption && (
                            <motion.div
                                key={`caption-${lightboxIndex}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center max-w-lg"
                            >
                                <p className="text-white/80 text-sm font-medium bg-black/40 backdrop-blur-sm px-5 py-2 rounded-full">
                                    {selectedAlbum.images[lightboxIndex].caption}
                                </p>
                            </motion.div>
                        )}

                        <div className="absolute top-4 left-4 text-white/50 text-sm font-mono">
                            {lightboxIndex + 1} / {selectedAlbum.images.length}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
