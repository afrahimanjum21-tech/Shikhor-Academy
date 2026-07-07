import { useEffect, useState, useRef, useCallback } from "react";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function Gallery() {
    const [albums, setAlbums] = useState([]);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    useEffect(() => {
        api.get('/public/gallery').then(res => setAlbums(res.data));
    }, []);

    const getUrl = (path) => path ? `http://localhost:8000/storage/${path}` : "https://placehold.co/600x400?text=No+Image";

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

    // কীবোর্ড নেভিগেশন
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

    // সোয়াইপ সাপোর্ট
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-[#F8FAFC] py-12 px-4 font-sans">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-center mb-10 text-[#1F4E79]">
                    {selectedAlbum ? selectedAlbum.name : 'Campus Gallery'}
                </h1>

                <AnimatePresence mode="wait">
                {!selectedAlbum ? (
                    <motion.div
                        key="albums"
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        {albums.map((album, idx) => (
                            <motion.div
                                key={album.id}
                                onClick={() => setSelectedAlbum(album)}
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                                whileHover={{ scale: 1.03 }}
                                className="cursor-pointer group relative rounded-xl overflow-hidden shadow-lg h-64 border border-gray-200"
                            >
                                <img src={getUrl(album.thumbnail || album.images?.[0]?.image_path)} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition">
                                    <h3 className="text-white text-2xl font-bold tracking-wider">{album.name}</h3>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="photos"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    >
                        <button onClick={() => setSelectedAlbum(null)} className="mb-6 text-[#1F4E79] hover:underline font-bold flex items-center gap-2">← Back to Albums</button>

                        {/* ফুল সাইজ ছবি - উপর থেকে নিচ সাজানো, scroll fade-in */}
                        <div className="flex flex-col gap-4">
                            {selectedAlbum.images.map((img, idx) => (
                                <motion.div
                                    key={img.id}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-30px" }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                    onClick={() => openLightbox(idx)}
                                    className="cursor-pointer group relative rounded-xl overflow-hidden shadow-lg bg-gray-100"
                                >
                                    <img 
                                        src={getUrl(img.image_path)} 
                                        className="w-full h-auto object-contain block"
                                        alt={img.caption || `Photo ${idx + 1}`}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>

            {/* ========== FULL SCREEN LIGHTBOX ========== */}
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
        </motion.div>
    );
}
