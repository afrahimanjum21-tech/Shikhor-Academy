import { useEffect, useState, useRef, useCallback } from "react";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import { motion, AnimatePresence } from "framer-motion";
import usePageMeta from "../hooks/usePageMeta";
import { X, ChevronLeft, ChevronRight, ArrowLeft, ImageOff, AlertCircle, ZoomIn } from "lucide-react";
import { useNotificationCounts } from "../context/NotificationContext";

export default function Gallery() {
    usePageMeta({
        title: "Gallery — Shikhor Academy",
        description: "Explore photos of life at Shikhor Academy: classes, events, programs and celebrations.",
        path: "/gallery",
    });
    const { markViewed } = useNotificationCounts();
    const [albums, setAlbums] = useState([]);
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadGallery = useCallback(() => {
        setLoading(true);
        setError(false);
        api.get('/public/gallery')
            .then(res => setAlbums(Array.isArray(res.data) ? res.data : []))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadGallery(); }, [loadGallery]);

    useEffect(() => { markViewed('gallery'); }, [markViewed]);

    const getUrl = (path) => path ? buildAssetUrl(path) : "https://placehold.co/600x400?text=No+Image";

    const openLightbox = (idx) => {
        setLightboxIndex(idx);
        setIsLightboxOpen(true);
    };

    const closeLightbox = () => {
        setIsLightboxOpen(false);
        setLightboxIndex(null);
    };

    // C22: lock body scroll only while the lightbox is open; restore the
    // PREVIOUS overflow on close or on unmount (navigating away mid-view) so
    // the scroll-lock never leaks to other pages.
    useEffect(() => {
        if (!isLightboxOpen) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [isLightboxOpen]);

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

    const albumImages = selectedAlbum?.images || [];

    return (
        <div className="min-h-screen font-sans">
            {/* Header — navy band (segment colour) */}
            <section className="relative overflow-hidden bg-ink text-white">
                <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
                <div className="relative mx-auto max-w-6xl px-4 py-10 text-center sm:px-6 lg:py-12">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
                        <p className="mb-1 font-bangla text-sm text-brass-100">আমাদের গ্যালারি</p>
                        <h1 className="font-display text-[1.7rem] font-semibold leading-tight sm:text-[2rem]">Campus gallery</h1>
                        <div className="mx-auto mt-3 h-px w-12 bg-brass" aria-hidden="true" />
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">Moments captured at Shikhor Academy.</p>
                    </motion.div>
                </div>
            </section>

            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
                {error ? (
                    <div className="py-20 text-center">
                        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500"><AlertCircle size={30} aria-hidden="true" /></div>
                        <h3 className="font-display text-xl font-semibold text-ink">Couldn&apos;t load the gallery</h3>
                        <p className="mt-1 text-sm text-slate-500">Something went wrong while fetching photos.</p>
                        <button onClick={loadGallery} className="mt-4 rounded-full bg-ink px-6 py-2 text-sm font-semibold text-white transition hover:bg-ink-700">Try again</button>
                    </div>
                ) : loading ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-56 animate-pulse rounded-2xl border border-slate-200/80 bg-slate-200 sm:h-60 lg:h-64" />
                        ))}
                    </div>
                ) : !selectedAlbum ? (
                    albums.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-paper text-slate-400"><ImageOff size={30} aria-hidden="true" /></div>
                            <h3 className="font-display text-xl font-semibold text-ink">No photos yet</h3>
                            <p className="mt-1 text-sm text-slate-500">Gallery albums will appear here once they&apos;re added.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {albums.map((album, idx) => (
                                <motion.button
                                    key={album.id}
                                    type="button"
                                    onClick={() => setSelectedAlbum(album)}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-40px" }}
                                    transition={{ duration: 0.45, delay: Math.min(idx * 0.08, 0.4) }}
                                    className="group relative block h-56 w-full overflow-hidden rounded-2xl border border-slate-200/80 text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 sm:h-60 lg:h-64"
                                >
                                    <img src={getUrl(album.thumbnail || album.images?.[0]?.image_path)} alt={album.name} loading="lazy"
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" aria-hidden="true" />
                                    <span className="pointer-events-none absolute right-4 top-4 h-10 w-10 rounded-tr-xl border-r-2 border-t-2 border-brass/50" aria-hidden="true" />
                                    <div className="absolute inset-x-0 bottom-0 p-5">
                                        <h3 className="font-display text-lg font-semibold text-white">{album.name}</h3>
                                        {album.images && (
                                            <p className="mt-0.5 text-sm text-white/80">{album.images.length} photo{album.images.length !== 1 ? 's' : ''}</p>
                                        )}
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )
                ) : (
                    <div>
                        <button
                            type="button"
                            onClick={() => setSelectedAlbum(null)}
                            className="mb-6 inline-flex items-center gap-1.5 rounded text-sm font-semibold text-ink transition-colors hover:text-brass-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                        >
                            <ArrowLeft size={16} aria-hidden="true" /> Back to albums
                        </button>

                        <div className="mb-5 flex items-end justify-between gap-4">
                            <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{selectedAlbum.name}</h2>
                            <p className="whitespace-nowrap text-sm text-slate-500">{albumImages.length} photo{albumImages.length !== 1 ? 's' : ''}</p>
                        </div>

                        {albumImages.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-paper text-slate-400"><ImageOff size={26} aria-hidden="true" /></div>
                                <p className="text-sm text-slate-500">This album has no photos yet.</p>
                            </div>
                        ) : (
                            <div className="columns-2 gap-4 md:columns-3 [column-fill:_balance]">
                                {albumImages.map((img, idx) => (
                                    <motion.button
                                        key={img.id}
                                        type="button"
                                        onClick={() => openLightbox(idx)}
                                        initial={{ opacity: 0, y: 40 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-30px" }}
                                        transition={{ duration: 0.5, ease: "easeOut", delay: (idx % 3) * 0.08 }}
                                        className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl border border-slate-200/80 bg-paper shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                                    >
                                        <img src={getUrl(img.image_path)} alt={img.caption || `Photo ${idx + 1}`} loading="lazy"
                                            className="block w-full object-cover transition duration-700 group-hover:scale-105" />
                                        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true">
                                            <div className="flex w-full items-center justify-between gap-2 p-4">
                                                <span className="line-clamp-2 text-left text-sm font-medium text-white drop-shadow">{img.caption || `Photo ${idx + 1}`}</span>
                                                <span className="shrink-0 rounded-full bg-white/15 p-1.5 text-white backdrop-blur-sm"><ZoomIn size={16} /></span>
                                            </div>
                                        </div>
                                        <span className="absolute left-3 top-3 rounded-full bg-ink/50 px-2 py-0.5 font-mono text-[11px] text-white/90 backdrop-blur-sm">{idx + 1}</span>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {isLightboxOpen && albumImages[lightboxIndex] && (
                    <motion.div
                        key="lightbox"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label={selectedAlbum?.name ? `${selectedAlbum.name} — photo viewer` : "Photo viewer"}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onClick={closeLightbox}
                    >
                        <div className="absolute left-4 top-4 font-mono text-sm text-white/60">{lightboxIndex + 1} / {albumImages.length}</div>

                        <button onClick={closeLightbox} aria-label="Close viewer"
                            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                            <X size={24} aria-hidden="true" />
                        </button>

                        {albumImages.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous photo"
                                    className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:left-5">
                                    <ChevronLeft size={26} aria-hidden="true" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next photo"
                                    className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:right-5">
                                    <ChevronRight size={26} aria-hidden="true" />
                                </button>
                            </>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.img
                                key={lightboxIndex}
                                src={getUrl(albumImages[lightboxIndex].image_path)}
                                alt={albumImages[lightboxIndex].caption || `Photo ${lightboxIndex + 1}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </AnimatePresence>

                        {albumImages[lightboxIndex].caption && (
                            <div className="absolute inset-x-0 bottom-6 flex justify-center px-4">
                                <p className="max-w-lg rounded-full bg-ink/60 px-5 py-2 text-center text-sm font-medium text-white/90 backdrop-blur-sm">
                                    {albumImages[lightboxIndex].caption}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
