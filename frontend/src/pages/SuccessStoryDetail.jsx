import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Award, CalendarDays, GraduationCap, Loader2, Quote, Trophy } from "lucide-react";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import usePageMeta from "../hooks/usePageMeta";

const initials = (name) =>
    (String(name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase());

const paragraphs = (story) =>
    String(story || "")
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

// "GPA-5" -> { label: "GPA", value: "5.00" }; anything else is shown verbatim.
const parseAchievement = (ach) => {
    const m = /^(.+?)\s*[-–:]\s*(\d+(?:\.\d+)?)\s*$/.exec(String(ach || "").trim());
    if (m) return { label: m[1].trim(), value: Number(m[2]).toFixed(2) };
    return null;
};

export default function SuccessStoryDetail() {
    const { slug } = useParams();
    const [story, setStory] = useState(null);
    const [related, setRelated] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    usePageMeta({
        title: story ? `${story.student_name} — Success Stories | Shikhor Academy` : "Success Story — Shikhor Academy",
        description: story
            ? `${story.student_name}${story.achievement ? ` — ${story.achievement}` : ""}${story.batch_info ? ` (${story.batch_info})` : ""}. A success story from Shikhor Academy.`
            : "A success story from Shikhor Academy.",
        path: `/success-stories/${story?.slug || slug}`,
        image: story?.photo,
    });

    useEffect(() => {
        let active = true;
        setLoading(true);
        setNotFound(false);
        api.get(`/public/success-stories/${encodeURIComponent(slug)}`)
            .then((res) => {
                if (!active) return;
                const s = res.data && res.data.data ? res.data.data : res.data;
                if (!s || !s.id) {
                    setNotFound(true);
                    return;
                }
                setStory(s);
            })
            .catch(() => {
                if (active) setNotFound(true);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [slug]);

    useEffect(() => {
        if (!story) return;
        let active = true;
        const fetchAll = async () => {
            const others = [];
            try {
                let total = null;
                while (true) {
                    const res = await api.get("/public/success-stories", { params: { limit: 100, offset: others.length } });
                    const list = Array.isArray(res.data) ? res.data : [];
                    if (!list.length) break;
                    for (const s of list) {
                        if (s.id !== story.id) others.push(s);
                    }
                    if (total === null) total = typeof list.total === "number" ? list.total : others.length;
                    if (others.length >= total || list.length < 100) break;
                }
                if (active) setRelated(others);
            } catch (e) {
                if (active) setRelated([]);
            }
        };
        fetchAll();
        return () => { active = false; };
    }, [story]);

    const parts = useMemo(() => paragraphs(story?.story), [story]);
    const lead = parts[0] || null;
    const body = parts.length > 1 ? parts.slice(1) : [];
    const message = story?.message || null;
    const achievement = parseAchievement(story?.achievement);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-white text-ink" role="status" aria-label="Loading success story">
                <Loader2 size={28} className="animate-spin" aria-hidden="true" />
            </div>
        );
    }

    if (notFound || !story) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-white px-4">
                <div className="max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-14 text-center shadow-card">
                    <GraduationCap size={48} className="mx-auto mb-4 text-ink/30" aria-hidden="true" />
                    <h1 className="mb-2 font-display text-xl font-semibold text-ink">Story not found</h1>
                    <p className="mb-6 text-sm text-slate-500">This success story may have been removed or is not published yet.</p>
                    <Link
                        to="/success-stories"
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                    >
                        <ArrowLeft size={16} /> Back to Success Stories
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans text-ink">
            {/* Navy editorial title band */}
            <section className="relative overflow-hidden bg-ink text-white">
                <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
                <div className="relative mx-auto max-w-6xl px-4 py-10 text-center sm:px-6 lg:py-12">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
                        <p className="mb-1 font-bangla text-sm text-brass-100">আমাদের অর্জনসমূহ</p>
                        <p className="text-sm font-medium text-slate-300">From hard work to achievement</p>
                        <h1 className="font-display text-[1.7rem] font-semibold leading-tight text-white sm:text-[2rem]">{story.student_name}</h1>
                        <div className="mx-auto mt-3 h-px w-12 bg-brass" aria-hidden="true" />
                        <p className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-sm text-slate-300 sm:text-base">
                            {story.batch_info && <span className="inline-flex items-center gap-1.5"><CalendarDays size={16} aria-hidden="true" /> {story.batch_info}</span>}
                            {story.batch_info && story.achievement && <span aria-hidden="true" className="text-slate-500">·</span>}
                            {story.achievement && <span className="font-semibold text-brass-100">{story.achievement}</span>}
                        </p>
                    </motion.div>
                </div>
            </section>

            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">

                {/* Photo + achievement panel */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-14 grid grid-cols-1 gap-8 lg:grid-cols-5"
                >
                    <div className="lg:col-span-2">
                        <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-lg">
                            {story.photo ? (
                                <img
                                    src={buildAssetUrl(story.photo)}
                                    alt={`${story.student_name} — Shikhor Academy`}
                                    className="w-full h-full object-cover object-top"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-ink">
                                    <span className="font-display text-6xl font-semibold text-white">{initials(story.student_name)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-3 flex flex-col justify-center">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Student achievement</p>
                        <h2 className="mb-3 font-display text-2xl font-semibold text-ink md:text-3xl">{story.student_name}</h2>
                        {story.batch_info && (
                            <p className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500">
                                <CalendarDays size={16} /> {story.batch_info}
                            </p>
                        )}

                        {achievement ? (
                            <div className="mb-6 inline-flex w-fit items-center gap-5 rounded-2xl border border-brass/25 bg-brass-100 px-6 py-5">
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brass text-ink">
                                    <Trophy size={22} />
                                </div>
                                <div className="pt-16">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-brass-600">{achievement.label}</p>
                                    <p className="font-display text-3xl font-semibold leading-tight text-ink">{achievement.value}</p>
                                </div>
                            </div>
                        ) : story.achievement ? (
                            <span className="mb-6 inline-flex w-fit items-center gap-2 rounded-xl border border-brass/25 bg-brass-100 px-5 py-3 font-semibold text-brass-600">
                                <Award size={18} /> {story.achievement}
                            </span>
                        ) : null}

                        {lead && (
                            <p className="border-l-4 border-brass pl-4 text-lg leading-relaxed text-slate-600">
                                {lead}
                            </p>
                        )}

                        <Link
                            to="/success-stories"
                            className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-ink transition hover:text-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                        >
                            <ArrowLeft size={15} /> Back to Success Stories
                        </Link>
                    </div>
                </motion.div>

                {/* Editorial story body */}
                <article className="max-w-3xl mx-auto">
                    {body.length > 0 && (
                        <>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="mb-10"
                            >
                                <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink">
                                    <span className="h-px flex-1 bg-slate-200" /> The Journey <span className="h-px flex-1 bg-slate-200" />
                                </h2>
                                {body.map((p, i) => (
                                    <p
                                        key={i}
                                        className={`mb-5 text-base leading-relaxed text-slate-700 sm:text-lg ${
                                            i === 0 ? "first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-5xl first-letter:font-semibold first-letter:leading-[0.9] first-letter:text-ink" : ""
                                        }`}
                                    >
                                        {p}
                                    </p>
                                ))}
                            </motion.div>

                            {/* Achievement highlight */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="relative my-10 overflow-hidden rounded-2xl bg-ink px-6 py-12 text-center text-white shadow-card-lg"
                            >
                                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full" aria-hidden="true" />
                                <h2 className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                                    <Award size={14} /> The Achievement
                                </h2>
                                {achievement ? (
                                    <p className="font-display text-5xl font-semibold leading-tight md:text-6xl">{achievement.value}</p>
                                ) : (
                                    <p className="text-2xl font-semibold leading-tight md:text-3xl">{story.achievement || "A proud achievement"}</p>
                                )}
                                <p className="mt-2 text-slate-300">
                                    {achievement ? achievement.label : "Achievement"} {story.batch_info ? `· ${story.batch_info}` : ""}
                                </p>
                            </motion.div>
                        </>
                    )}

                    {message && (
                        <motion.blockquote
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="relative my-10 rounded-2xl border border-slate-200 bg-paper px-7 py-8 shadow-card"
                        >
                            <Quote size={36} className="absolute left-6 top-5 text-ink/15" aria-hidden="true" />
                            <h2 className="mb-4 pl-10 text-xs font-semibold uppercase tracking-[0.16em] text-ink">
                                A Message From {story.student_name.split(" ")[0] || story.student_name}
                            </h2>
                            <p className="pl-10 text-lg italic leading-relaxed text-slate-700">{message}</p>
                        </motion.blockquote>
                    )}
                </article>

                {/* More stories */}
                {related.length > 0 && (
                    <section className="max-w-5xl mx-auto mt-16">
                        <h2 className="mb-6 flex items-center gap-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            <span className="h-px flex-1 bg-slate-200" /> More Success Stories <span className="h-px flex-1 bg-slate-200" />
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {related.map((s) => (
                                <Link
                                    key={s.id}
                                    to={`/success-stories/${s.slug || s.id}`}
                                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                                            {s.photo ? (
                                                <img src={buildAssetUrl(s.photo)} alt={s.student_name} loading="lazy" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-bold text-ink">{initials(s.student_name)}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-ink">{s.student_name}</p>
                                            {s.batch_info && <p className="truncate text-xs text-slate-500">{s.batch_info}</p>}
                                        </div>
                                    </div>
                                    {s.achievement && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-brass/25 bg-brass-100 px-2.5 py-0.5 text-[11px] font-semibold text-brass-600">
                                            <Award size={12} /> {s.achievement}
                                        </span>
                                    )}
                                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink group-hover:text-brass-600">
                                        Read story <ArrowRight size={13} />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

            </div>

                {/* CTA */}
                <div>
                    <motion.section
                        initial={{ opacity: 0, y: 24 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative overflow-hidden bg-ink px-6 py-12 text-center text-white shadow-card-lg md:py-14"
                    >
                        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" aria-hidden="true" />
                        <div className="absolute -bottom-16 -left-10 w-64 h-64 bg-white/5 rounded-full" aria-hidden="true" />
                        <div className="relative mx-auto max-w-6xl">
                            <h2 className="relative mb-3 font-display text-2xl font-semibold md:text-3xl">The Next Success Story Could Be Yours!</h2>
                            <p className="relative mx-auto mb-8 max-w-xl text-sm text-slate-300 md:text-base">
                                Join the next generation of achievers at Shikhor Academy — expert mentors, regular evaluation, and a proven path to results.
                            </p>
                            <div className="relative flex flex-col justify-center gap-3 sm:flex-row">
                            <Link to="/admission" className="min-h-11 rounded-xl bg-brass px-7 py-3 text-sm font-semibold text-ink transition hover:bg-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
                                Enroll Now
                            </Link>
                            <Link to="/contact" className="min-h-11 rounded-xl border border-white/30 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
                                Contact Us
                            </Link>
                            </div>
                        </div>
                    </motion.section>
                </div>
        </div>
    );
}