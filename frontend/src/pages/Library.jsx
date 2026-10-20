import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import {
    AlertTriangle,
    ArrowRight,
    BookOpen,
    Download,
    ExternalLink,
    FileText,
    Link as LinkIcon,
    Lock,
    LogIn,
    Search,
} from "lucide-react";
import usePageMeta from "../hooks/usePageMeta";
import { motion, MotionConfig } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotificationCounts } from "../context/NotificationContext";

// Boxed-select chevron (slate) — same treatment as the Faculty page filters.
const SELECT_CHEVRON =
    "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat";
const selectCls =
    `h-11 min-w-[150px] flex-1 appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm text-slate-600 outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/15 sm:w-44 sm:flex-none ${SELECT_CHEVRON}`;

const ACTION_CLS =
    "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brass px-4 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-brass-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2";
const LOCKED_CLS =
    "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-paper px-4 text-center text-sm font-medium text-slate-500";

// Short, human label for a stored MIME type ("application/pdf" → "PDF file").
const FILE_TYPE_LABELS = {
    "application/pdf": "PDF",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.ms-excel": "XLS",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "application/vnd.ms-powerpoint": "PPT",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
    "application/zip": "ZIP",
    "application/x-zip-compressed": "ZIP",
    "application/octet-stream": "File",
    "text/plain": "TXT",
    "text/csv": "CSV",
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/gif": "GIF",
};

const fileTypeLabel = (item) => {
    if (item.type === "link") return "External link";
    const raw = String(item.file_type || "").trim();
    if (!raw) return "Document";
    const mapped = FILE_TYPE_LABELS[raw.toLowerCase()];
    if (mapped) return `${mapped} file`;
    const subtype = (raw.split("/").pop() || raw).split(";")[0].trim();
    return subtype ? `${subtype.toUpperCase().slice(0, 10)} file` : "Document";
};

const kindOf = (item) => (item.type === "link" ? "link" : "file");

export default function Library({ requireAuth = false }) {
    usePageMeta({
        title: "Library & Study Materials — Shikhor Academy",
        description: "Access study materials, notes and resources from Shikhor Academy's library.",
        path: "/library",
    });
    const { token } = useAuth();
    const { markViewed } = useNotificationCounts();
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterSubject, setFilterSubject] = useState("");
    const [filterType, setFilterType] = useState("");

    const loadMaterials = useCallback(() => {
        setLoading(true);
        setError(false);
        api.get('/public/materials')
            .then(res => setMaterials(Array.isArray(res.data) ? res.data : []))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadMaterials(); }, [loadMaterials]);

    useEffect(() => { markViewed('library'); }, [markViewed]);

    // Only subjects that actually exist on the returned materials become
    // filter options — no invented categories.
    const subjects = useMemo(() => {
        const seen = new Set();
        materials.forEach(m => {
            const s = (m.subject || "").trim();
            if (s) seen.add(s);
        });
        return Array.from(seen).sort((a, b) => a.localeCompare(b));
    }, [materials]);

    const filtersActive = Boolean(searchTerm || filterSubject || filterType);

    const filtered = materials.filter(m => {
        if (searchTerm && !(m.title || "").toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (filterSubject && (m.subject || "").trim() !== filterSubject) return false;
        if (filterType && kindOf(m) !== filterType) return false;
        return true;
    });

    const clearFilters = () => {
        setSearchTerm("");
        setFilterSubject("");
        setFilterType("");
    };

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

    // The student panel renders inside a 288px sidebar shell, so its content
    // column is much narrower than the public page at the same viewport —
    // keep a single column until the cards actually have room.
    const gridCls = isPublicLockedPage
        ? "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
        : "grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3";

    const accessHint = (item) => {
        if (item.access_type === 'batch') return item.Batch?.name ? `For ${item.Batch.name} only` : 'Batch locked';
        if (item.access_type === 'class') return item.class_name ? `For ${item.class_name} class only` : 'Class locked';
        if (item.access_type === 'course') return item.Course?.title ? `For ${item.Course.title} only` : 'Course locked';
        return 'Restricted';
    };

    const renderSkeleton = () => (
        <div className={gridCls}>
            {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
                    <div className="flex items-start gap-4">
                        <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />
                        <div className="min-w-0 flex-1">
                            <div className="h-4 w-3/4 rounded bg-slate-200" />
                            <div className="mt-2.5 h-3 w-1/3 rounded-full bg-slate-200" />
                            <div className="mt-3 h-3 w-full rounded bg-slate-200" />
                        </div>
                    </div>
                    <div className="mt-5 h-11 w-full rounded-xl bg-slate-100" />
                </div>
            ))}
        </div>
    );

    const renderError = () => (
        <div className="py-20 text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                <AlertTriangle size={30} aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-semibold text-ink">Couldn&apos;t load the library</h3>
            <p className="mt-1 text-sm text-slate-500">Something went wrong while fetching study materials.</p>
            <button onClick={loadMaterials}
                className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-ink px-6 py-2 text-sm font-semibold text-white transition hover:bg-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2">
                Try again
            </button>
        </div>
    );

    const renderEmpty = () => (
        <div className="py-20 text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-paper text-slate-400">
                <FileText size={30} aria-hidden="true" />
            </div>
            <h3 className="font-display text-xl font-semibold text-ink">No materials found</h3>
            <p className="mt-1 text-sm text-slate-500">
                {filtersActive ? "Try adjusting your search or filters." : "Study materials will appear here once they're added."}
            </p>
            {filtersActive && (
                <button onClick={clearFilters}
                    className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-ink px-6 py-2 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30">
                    Clear filters
                </button>
            )}
        </div>
    );

    const renderMaterialCard = (item, idx) => {
        const isLink = kindOf(item) === 'link';
        const unlocked = Boolean(item.is_unlocked);
        const hasTarget = isLink ? Boolean(item.url) : Boolean(item.file_path);

        return (
            <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: Math.min(idx * 0.06, 0.4) }}
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-card-lg"
            >
                <div className="flex items-start gap-4">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isLink ? 'bg-brass-100 text-brass-600' : 'bg-ink/5 text-ink'}`} aria-hidden="true">
                        {isLink ? <LinkIcon size={22} /> : <FileText size={22} />}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-ink">{item.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {fileTypeLabel(item)}
                            </span>
                            {item.subject && (
                                <span className="rounded-full bg-brass-100 px-2.5 py-1 text-[11px] font-semibold text-brass-600">{item.subject}</span>
                            )}
                            {!unlocked && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-500">
                                    <Lock size={11} aria-hidden="true" /> Restricted
                                </span>
                            )}
                        </div>
                        {item.description && (
                            <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-slate-500">{item.description}</p>
                        )}
                        {item.Uploader?.name && (
                            <p className="mt-2 text-xs text-slate-400">
                                Uploaded by <span className="font-medium text-slate-500">{item.Uploader.name}</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-auto pt-4">
                    {unlocked && hasTarget && isLink && (
                        <a href={item.url} target="_blank" rel="noreferrer" className={ACTION_CLS}>
                            <ExternalLink size={17} aria-hidden="true" /> Open link
                        </a>
                    )}
                    {unlocked && hasTarget && !isLink && (
                        <a href={getUrl(item.file_path)} target="_blank" rel="noreferrer" className={ACTION_CLS}>
                            <Download size={17} aria-hidden="true" /> Download
                        </a>
                    )}
                    {(!unlocked || !hasTarget) && (
                        <span className={LOCKED_CLS}>
                            <Lock size={15} aria-hidden="true" /> {unlocked ? 'File unavailable' : accessHint(item)}
                        </span>
                    )}
                </div>
            </motion.article>
        );
    };

    return (
        <MotionConfig reducedMotion="user">
            <div className={`min-h-screen bg-white font-sans ${isPublicLockedPage ? '' : 'sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200/70'}`}>
                {/* Header — navy title band (segment colour) */}
                <section className="relative overflow-hidden bg-ink text-white">
                    <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
                    <div className="relative mx-auto max-w-6xl px-4 py-10 text-center sm:px-6 lg:py-12">
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
                            <p className="mb-1 font-bangla text-sm text-brass-100">আমাদের লাইব্রেরি</p>
                            <h1 className="font-display text-[1.7rem] font-semibold leading-tight sm:text-[2rem]">Digital library</h1>
                            <div className="mx-auto mt-3 h-px w-12 bg-brass" aria-hidden="true" />
                            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                                Download study notes and lecture sheets to enhance your learning.
                            </p>
                        </motion.div>
                    </div>
                </section>

                <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
                    {isPublicLockedPage && !isLoggedIn ? (
                        <>
                            {/* Login Prompt — only for public locked page & not logged in */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
                                className="relative mb-8 overflow-hidden rounded-2xl bg-ink text-white shadow-card-lg"
                            >
                                <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
                                <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                                    <div className="flex flex-col items-start gap-4 sm:flex-row">
                                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brass-100" aria-hidden="true">
                                            <BookOpen size={24} />
                                        </span>
                                        <div>
                                            <h2 className="font-display text-lg font-semibold sm:text-xl">Student access required</h2>
                                            <p className="mt-1 max-w-xl text-sm text-slate-300">
                                                Please log in as a student to access the full library with all study materials.
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        to="/login"
                                        className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brass px-6 text-sm font-semibold text-ink shadow-sm transition hover:bg-brass-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:w-auto"
                                    >
                                        <LogIn size={18} aria-hidden="true" /> Student login <ArrowRight size={16} aria-hidden="true" />
                                    </Link>
                                </div>
                            </motion.div>

                            {/* Guest — blurred preview of the first few materials */}
                            {loading ? (
                                renderSkeleton()
                            ) : error ? (
                                renderError()
                            ) : filtered.length === 0 ? (
                                renderEmpty()
                            ) : (
                                <div className={gridCls}>
                                    {filtered.slice(0, 6).map((item, idx) => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true, margin: "-40px" }}
                                            transition={{ duration: 0.4, delay: Math.min(idx * 0.06, 0.4) }}
                                            className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card"
                                        >
                                            <div className="flex items-start gap-4 opacity-60" aria-hidden="true">
                                                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${kindOf(item) === 'link' ? 'bg-brass-100 text-brass-600' : 'bg-ink/5 text-ink'}`}>
                                                    {kindOf(item) === 'link' ? <LinkIcon size={22} /> : <FileText size={22} />}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-ink">{item.title}</h3>
                                                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{fileTypeLabel(item)}</p>
                                                </div>
                                            </div>
                                            <Link
                                                to="/login"
                                                aria-label={`Log in to access ${item.title}`}
                                                className="absolute inset-0 z-10 flex items-center justify-center bg-white/45 backdrop-blur-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/50"
                                            >
                                                <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-ink px-5 text-sm font-semibold text-white shadow-md transition-colors">
                                                    <LogIn size={16} aria-hidden="true" /> Login to access
                                                </span>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Search / filter toolbar — tinted pale blue-gray panel */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-8 rounded-2xl border border-slate-200/80 bg-paper p-4 shadow-card sm:p-5"
                            >
                                <div className="flex flex-col gap-3">
                                    <div className="relative w-full">
                                        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Search materials..."
                                            aria-label="Search materials"
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-ink focus:ring-2 focus:ring-ink/15"
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        {subjects.length > 0 && (
                                            <select
                                                value={filterSubject}
                                                onChange={e => setFilterSubject(e.target.value)}
                                                aria-label="Filter by subject"
                                                className={selectCls}
                                            >
                                                <option value="">All subjects</option>
                                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        )}
                                        <select
                                            value={filterType}
                                            onChange={e => setFilterType(e.target.value)}
                                            aria-label="Filter by resource type"
                                            className={selectCls}
                                        >
                                            <option value="">All types</option>
                                            <option value="file">Documents</option>
                                            <option value="link">External links</option>
                                        </select>
                                        {filtersActive && (
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="h-11 whitespace-nowrap rounded-xl px-4 text-xs font-semibold text-slate-500 transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                                            >
                                                Reset filters
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Results header */}
                            {!loading && !error && filtered.length > 0 && (
                                <p className="mb-5 text-sm text-slate-500">
                                    Showing <span className="font-semibold text-ink">{filtered.length}</span>
                                    {filtersActive ? <> of <span className="font-semibold text-ink">{materials.length}</span></> : null}
                                    {' '}material{filtered.length === 1 ? '' : 's'}
                                </p>
                            )}

                            {/* Full list for logged-in users */}
                            {error ? (
                                renderError()
                            ) : loading ? (
                                renderSkeleton()
                            ) : filtered.length === 0 ? (
                                renderEmpty()
                            ) : (
                                <div className={gridCls}>
                                    {filtered.map((item, idx) => renderMaterialCard(item, idx))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </MotionConfig>
    );
}
