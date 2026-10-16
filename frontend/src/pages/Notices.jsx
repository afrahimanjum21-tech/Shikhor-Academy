import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { Bell, Calendar, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import usePageMeta from "../hooks/usePageMeta";
import ShareButtons from "../components/common/ShareButtons";
import { useNotificationCounts } from "../context/NotificationContext";

export default function Notices() {
    usePageMeta({
        title: "Notices — Shikhor Academy",
        description: "Latest notices and announcements from Shikhor Academy: class schedules, exams, results and important updates.",
        path: "/notices",
    });
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { markViewed } = useNotificationCounts();

    useEffect(() => { markViewed('notices'); }, [markViewed]);

    const loadNotices = useCallback(() => {
        setLoading(true);
        setError(false);
        api.get('/public/notices')
            .then(res => setNotices(Array.isArray(res.data) ? res.data : []))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadNotices(); }, [loadNotices]);

    return (
        <div className="min-h-screen font-sans">
            {/* Header — navy band (segment colour) */}
            <section className="relative overflow-hidden bg-ink text-white">
                <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
                <div className="relative mx-auto max-w-5xl px-4 py-10 text-center sm:px-6 lg:py-12">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
                        <p className="mb-1 font-bangla text-sm text-brass-100">নোটিশ বোর্ড</p>
                        <h1 className="font-display text-[1.7rem] font-semibold leading-tight sm:text-[2rem]">Notice board</h1>
                        <div className="mx-auto mt-3 h-px w-12 bg-brass" aria-hidden="true" />
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">Latest updates and announcements from Shikhor Academy.</p>
                    </motion.div>
                </div>
            </section>

            <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
                {error ? (
                    <div className="py-20 text-center">
                        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500"><AlertTriangle size={30} aria-hidden="true" /></div>
                        <h3 className="font-display text-xl font-semibold text-ink">Couldn&apos;t load notices</h3>
                        <p className="mt-1 text-sm text-slate-500">Something went wrong while fetching updates.</p>
                        <button onClick={loadNotices} className="mt-4 rounded-full bg-ink px-6 py-2 text-sm font-semibold text-white transition hover:bg-ink-700">Try again</button>
                    </div>
                ) : loading ? (
                    <div className="space-y-5">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="animate-pulse rounded-2xl border border-slate-200/80 bg-paper p-5 shadow-card sm:p-6">
                                <div className="h-4 w-24 rounded-full bg-slate-200" />
                                <div className="mt-3 h-5 w-2/3 rounded bg-slate-200" />
                                <div className="mt-3 h-3 w-full rounded bg-slate-200" />
                                <div className="mt-2 h-3 w-4/5 rounded bg-slate-200" />
                            </div>
                        ))}
                    </div>
                ) : notices.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-paper text-slate-400"><Bell size={30} aria-hidden="true" /></div>
                        <h3 className="font-display text-xl font-semibold text-ink">No notices yet</h3>
                        <p className="mt-1 text-sm text-slate-500">Check back later for updates.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {notices.map((notice) => {
                            const isUrgent = (notice.type || "").toLowerCase() === "urgent";
                            return (
                                <motion.article
                                    key={notice.id}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-40px" }}
                                    transition={{ duration: 0.45 }}
                                    className="rounded-2xl border border-l-4 border-slate-200/80 bg-paper p-5 shadow-card transition-shadow hover:shadow-card-lg sm:p-6"
                                    style={{ borderLeftColor: isUrgent ? "#EF4444" : "#C8A14A" }}
                                >
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                        {notice.type && (
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${isUrgent ? "bg-red-50 text-red-700" : "bg-brass-100 text-brass-600"}`}>
                                                {isUrgent && <AlertTriangle size={11} className="mr-1" aria-hidden="true" />}
                                                {notice.type}
                                            </span>
                                        )}
                                        {notice.date && (
                                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                                <Calendar size={14} className="text-slate-400" aria-hidden="true" /> {notice.date}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="mt-3 break-words font-display text-lg font-semibold text-ink sm:text-xl">{notice.title}</h2>
                                    {notice.description && (
                                        <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-slate-600">{notice.description}</p>
                                    )}
                                    <ShareButtons
                                        text={`${notice.title} — Shikhor Academy`}
                                        url="/notices"
                                        className="mt-4"
                                    />
                                </motion.article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
