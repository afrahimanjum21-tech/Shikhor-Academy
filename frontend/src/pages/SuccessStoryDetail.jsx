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
        title: story ? `${story.student_name} — Success Stories | Uttoron Coaching Centre` : "Success Story — Uttoron Coaching Centre",
        description: story
            ? `${story.student_name}${story.achievement ? ` — ${story.achievement}` : ""}${story.batch_info ? ` (${story.batch_info})` : ""}. A success story from Uttoron Coaching Centre.`
            : "A success story from Uttoron Coaching Centre.",
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
            <div className="min-h-[60vh] flex items-center justify-center text-[#1F4E79]">
                <Loader2 size={28} className="animate-spin" />
            </div>
        );
    }

    if (notFound || !story) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-4">
                <div className="text-center bg-white border border-gray-200 rounded-2xl shadow-sm px-8 py-14 max-w-md">
                    <GraduationCap size={48} className="mx-auto text-[#1F4E79]/30 mb-4" />
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Story not found</h1>
                    <p className="text-gray-500 text-sm mb-6">This success story may have been removed or is not published yet.</p>
                    <Link
                        to="/success-stories"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1F4E79] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#163859] transition"
                    >
                        <ArrowLeft size={16} /> Back to Success Stories
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
                {/* Breadcrumb + back */}
                <nav aria-label="Breadcrumb" className="mb-8">
                    <ol className="flex items-center flex-wrap gap-1.5 text-xs sm:text-sm text-gray-500">
                        <li><Link to="/" className="hover:text-[#1F4E79] transition font-medium">Home</Link></li>
                        <li aria-hidden="true" className="text-gray-300">/</li>
                        <li><Link to="/success-stories" className="hover:text-[#1F4E79] transition font-medium">Success Stories</Link></li>
                        <li aria-hidden="true" className="text-gray-300">/</li>
                        <li aria-current="page" className="text-[#1F4E79] font-semibold truncate max-w-[200px] sm:max-w-none">{story.student_name}</li>
                    </ol>
                </nav>

                {/* Hero */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1F4E79]/10 text-[#1F4E79] text-xs font-bold uppercase tracking-wider mb-4">
                        <Trophy size={14} /> Our Success Stories
                    </div>
                    <p className="text-gray-500 font-medium text-sm sm:text-base mb-1">From Hard Work to Achievement</p>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1F4E79] mb-3">{story.student_name}</h1>
                    <p className="text-gray-500 flex items-center justify-center gap-2 flex-wrap">
                        {story.batch_info && <span className="inline-flex items-center gap-1.5"><CalendarDays size={16} /> {story.batch_info}</span>}
                        {story.batch_info && story.achievement && <span aria-hidden="true" className="text-gray-300">·</span>}
                        {story.achievement && <span className="font-semibold text-green-700">{story.achievement}</span>}
                    </p>
                </motion.div>

                {/* Photo + achievement panel */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-14"
                >
                    <div className="lg:col-span-2">
                        <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-white aspect-[4/5]">
                            {story.photo ? (
                                <img
                                    src={buildAssetUrl(story.photo)}
                                    alt={`${story.student_name} — Uttoron Coaching Centre`}
                                    className="w-full h-full object-cover object-top"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#1F4E79] to-[#163859] flex items-center justify-center">
                                    <span className="text-white text-6xl font-bold">{initials(story.student_name)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-3 flex flex-col justify-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Student Achievement</p>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">{story.student_name}</h2>
                        {story.batch_info && (
                            <p className="text-gray-500 inline-flex items-center gap-1.5 mb-5">
                                <CalendarDays size={16} /> {story.batch_info}
                            </p>
                        )}

                        {achievement ? (
                            <div className="rounded-xl bg-green-50 border border-green-200 px-6 py-5 mb-6 inline-flex items-center gap-5 w-fit">
                                <div className="h-12 w-12 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0">
                                    <Trophy size={22} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-green-600">{achievement.label}</p>
                                    <p className="text-3xl font-extrabold text-green-700 leading-tight">{achievement.value}</p>
                                </div>
                            </div>
                        ) : story.achievement ? (
                            <span className="inline-flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-5 py-3 text-green-700 font-bold mb-6 w-fit">
                                <Award size={18} /> {story.achievement}
                            </span>
                        ) : null}

                        {lead && (
                            <p className="text-lg text-gray-600 leading-relaxed border-l-4 border-[#1F4E79] pl-4">
                                {lead}
                            </p>
                        )}

                        <Link
                            to="/success-stories"
                            className="inline-flex items-center gap-2 text-[#1F4E79] font-bold text-sm mt-6 hover:underline w-fit"
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
                                <h2 className="text-xs font-bold uppercase tracking-widest text-[#1F4E79] mb-4 flex items-center gap-2">
                                    <span className="h-px flex-1 bg-gray-200" /> The Journey <span className="h-px flex-1 bg-gray-200" />
                                </h2>
                                {body.map((p, i) => (
                                    <p
                                        key={i}
                                        className={`text-gray-700 leading-relaxed mb-5 ${
                                            i === 0 ? "first-letter:text-5xl first-letter:font-bold first-letter:text-[#1F4E79] first-letter:float-left first-letter:mr-3 first-letter:leading-[0.9]" : ""
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
                                className="rounded-2xl bg-gradient-to-r from-[#1F4E79] to-[#163859] text-white text-center px-6 py-12 my-10 relative overflow-hidden"
                            >
                                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full" aria-hidden="true" />
                                <h2 className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2 flex items-center justify-center gap-2">
                                    <Award size={14} /> The Achievement
                                </h2>
                                {achievement ? (
                                    <p className="text-5xl md:text-6xl font-extrabold leading-tight">{achievement.value}</p>
                                ) : (
                                    <p className="text-2xl md:text-3xl font-extrabold leading-tight">{story.achievement || "A proud achievement"}</p>
                                )}
                                <p className="text-white/80 mt-2">
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
                            className="rounded-2xl bg-white border border-gray-200 shadow-sm px-7 py-8 my-10 relative"
                        >
                            <Quote size={36} className="text-[#1F4E79]/15 absolute top-5 left-6" />
                            <h2 className="text-xs font-bold uppercase tracking-widest text-[#1F4E79] mb-4 pl-10">
                                A Message From {story.student_name.split(" ")[0] || story.student_name}
                            </h2>
                            <p className="text-lg text-gray-700 leading-relaxed italic pl-10">{message}</p>
                        </motion.blockquote>
                    )}
                </article>

                {/* More stories */}
                {related.length > 0 && (
                    <section className="max-w-5xl mx-auto mt-16">
                        <h2 className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-3">
                            <span className="h-px flex-1 bg-gray-200" /> More Success Stories <span className="h-px flex-1 bg-gray-200" />
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {related.map((s) => (
                                <Link
                                    key={s.id}
                                    to={`/success-stories/${s.slug || s.id}`}
                                    className="group bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#E6EEF5] flex items-center justify-center flex-shrink-0">
                                            {s.photo ? (
                                                <img src={buildAssetUrl(s.photo)} alt={s.student_name} loading="lazy" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[#1F4E79] font-bold text-sm">{initials(s.student_name)}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 text-sm truncate">{s.student_name}</p>
                                            {s.batch_info && <p className="text-xs text-gray-400 truncate">{s.batch_info}</p>}
                                        </div>
                                    </div>
                                    {s.achievement && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-green-100 text-green-700 text-[11px] font-bold">
                                            <Award size={12} /> {s.achievement}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1.5 text-[#1F4E79] font-bold text-xs mt-3 group-hover:underline">
                                        Read story <ArrowRight size={13} />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* CTA */}
                <motion.section
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-16 rounded-2xl bg-gradient-to-r from-[#1F4E79] to-[#163859] text-white px-6 py-12 md:py-14 text-center relative overflow-hidden"
                >
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" aria-hidden="true" />
                    <div className="absolute -bottom-16 -left-10 w-64 h-64 bg-white/5 rounded-full" aria-hidden="true" />
                    <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">The Next Success Story Could Be Yours!</h2>
                    <p className="text-white/80 max-w-xl mx-auto mb-8 relative text-sm md:text-base">
                        Join the next generation of achievers at Uttoron Coaching Centre — expert mentors, regular evaluation, and a proven path to results.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
                        <Link to="/admission" className="rounded-lg bg-white text-[#1F4E79] px-7 py-3 text-sm font-bold hover:bg-gray-100 transition">
                            Enroll Now
                        </Link>
                        <Link to="/contact" className="rounded-lg border border-white/60 text-white px-7 py-3 text-sm font-bold hover:bg-white/10 transition">
                            Contact Us
                        </Link>
                    </div>
                </motion.section>
            </div>
        </div>
    );
}