import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Loader2, Search, SortAsc, Trophy, ArrowRight, Award, CalendarDays, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import usePageMeta from "../hooks/usePageMeta";

const SITE_URL = "https://www.shikhoracademy.me";
const PER_PAGE = 12;

const initials = (name) =>
    (String(name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase());

export default function SuccessStories() {
    usePageMeta({
        title: "Success Stories — Shikhor Academy",
        description: "Meet our students — admissions to top universities, public exam results, and proud achievements at Shikhor Academy.",
        path: "/success-stories",
    });

    const [stories, setStories] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("order");

    const fetchPage = useCallback(async (offset) => {
        const res = await api.get("/public/success-stories", { params: { limit: PER_PAGE, offset } });
        const data = Array.isArray(res.data) ? res.data : [];
        const serverTotal = res.data.total ?? res.data.length;
        return { data, serverTotal };
    }, []);

    useEffect(() => {
        let active = true;
        setLoading(true);
        fetchPage(0)
            .then(({ data, serverTotal }) => {
                if (!active) return;
                setStories(data);
                setTotal(serverTotal);
                setHasMore(data.length < serverTotal);
            })
            .catch(() => {
                if (active) setStories([]);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [fetchPage]);

    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const { data, serverTotal } = await fetchPage(stories.length);
            setStories((prev) => [...prev, ...data]);
            setTotal(serverTotal);
            setHasMore(stories.length + data.length < serverTotal);
        } catch {
            // keep current state
        } finally {
            setLoadingMore(false);
        }
    };

    const visible = useMemo(() => {
        const q = String(search || "").trim().toLowerCase();
        let list = stories;
        if (q) {
            list = stories.filter((s) =>
                [s.student_name, s.achievement, s.batch_info, s.story]
                    .filter(Boolean)
                    .some((v) => String(v).toLowerCase().includes(q))
            );
        }
        const sorted = [...list];
        if (sort === "newest") {
            sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        } else if (sort === "name") {
            sorted.sort((a, b) => String(a.student_name || "").localeCompare(String(b.student_name || "")));
        } else {
            sorted.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }
        return sorted;
    }, [stories, search, sort]);

    // SEO: JSON-LD structured data for the loaded stories.
    useEffect(() => {
        if (stories.length === 0) return;
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = "success-stories-jsonld";
        script.textContent = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Success Stories — Shikhor Academy",
            itemListElement: stories.map((s, i) => ({
                "@type": "ListItem",
                position: i + 1,
                item: {
                    "@type": "Article",
                    headline: s.student_name,
                    description: s.achievement || undefined,
                    articleBody: s.story || undefined,
                    author: { "@type": "Person", name: s.student_name },
                    datePublished: s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : undefined,
                    url: `${SITE_URL}/success-stories/${s.slug || s.id}`,
                },
            })),
        });
        document.head.appendChild(script);
        return () => { document.getElementById("success-stories-jsonld")?.remove(); };
    }, [stories]);

    const sortOptions = [
        { value: "order", label: "Display order" },
        { value: "newest", label: "Newest first" },
        { value: "name", label: "Name (A–Z)" },
    ];

    return (
        <div className="relative min-h-screen overflow-hidden bg-white font-sans text-ink">
            {/* Hero */}
            <section className="relative overflow-hidden bg-ink text-white">
                <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
                <div className="relative mx-auto max-w-6xl px-4 py-10 text-center sm:px-6 lg:py-12">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
                        <p className="mb-1 font-bangla text-sm text-brass-100">আমাদের অর্জনসমূহ</p>
                        <h1 className="font-display text-[1.7rem] font-semibold leading-tight sm:text-[2rem]">Our Success Stories</h1>
                        <div className="mx-auto mt-3 h-px w-12 bg-brass" aria-hidden="true" />
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                            Real results from real students — admissions to top universities, outstanding public exam grades, and milestones that started here.
                        </p>
                    </motion.div>
                </div>
            </section>

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                {/* Search + Sort */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-100/85 p-4 shadow-card backdrop-blur-sm sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative min-w-0 flex-1">
                            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by student, achievement or batch…"
                                aria-label="Search success stories"
                                className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-ink focus:ring-2 focus:ring-ink/15"
                            />
                        </div>
                        <div className="relative sm:w-52">
                            <SortAsc size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                aria-label="Sort success stories"
                                className="min-h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-700 outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/15"
                            >
                                {sortOptions.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-ink" role="status" aria-label="Loading success stories">
                        <Loader2 size={28} className="animate-spin" aria-hidden="true" />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-paper/80 px-5 py-20 text-center shadow-card backdrop-blur-sm">
                        <GraduationCap size={48} className="mx-auto mb-4 text-ink/30" aria-hidden="true" />
                        <h2 className="mb-1 text-xl font-display font-semibold text-ink">
                            {search ? "No stories match your search" : "Stories are coming soon"}
                        </h2>
                        <p className="mx-auto max-w-md text-sm text-slate-500">
                            {search
                                ? "Try a different name, achievement or batch."
                                : "We are collecting our students' achievements — check back soon."}
                        </p>
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="mt-5 min-h-11 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="mb-5 text-center text-sm text-slate-500" role="status">
                            Showing {visible.length} of {total} {total === 1 ? "story" : "stories"}
                        </p>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {visible.map((story, idx) => (
                                <motion.article
                                    key={story.id}
                                    role="article"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-30px" }}
                                    transition={{ duration: 0.4, delay: Math.min(idx % 4, 3) * 0.06 }}
                                    className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brass/40 hover:shadow-card-lg focus-within:ring-2 focus-within:ring-brass/50 sm:p-6"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                                            {story.photo ? (
                                                <img
                                                    src={buildAssetUrl(story.photo)}
                                                    alt={`${story.student_name} — Shikhor Academy`}
                                                    width={48}
                                                    height={48}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-base font-bold text-ink">{initials(story.student_name) || <Trophy size={18} />}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="truncate font-display font-semibold leading-tight text-ink">{story.student_name}</h3>
                                            {story.batch_info && (
                                                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                                    <CalendarDays size={12} className="flex-shrink-0" /> {story.batch_info}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {story.achievement && (
                                        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-brass/25 bg-brass-100 px-3 py-1 text-xs font-semibold text-brass-600">
                                            <Award size={13} /> {story.achievement}
                                        </span>
                                    )}

                                    <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{story.story || "…"}</p>

                                    <Link
                                        to={`/success-stories/${story.slug || story.id}`}
                                        aria-label={`Read the full story of ${story.student_name}`}
                                        className="mt-5 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                                    >
                                        Read More <ArrowRight size={15} />
                                    </Link>
                                </motion.article>
                            ))}
                        </div>

                        {hasMore && (
                            <div className="mt-10 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink px-6 py-3 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:opacity-60"
                                >
                                    {loadingMore ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
                                    {loadingMore ? "Loading…" : "Load More Stories"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* CTA */}
            <section className="w-full">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative overflow-hidden bg-ink px-6 py-12 text-center text-white shadow-card-lg sm:px-10 md:py-14"
                >
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" aria-hidden="true" />
                    <div className="absolute -bottom-16 -left-10 w-64 h-64 bg-white/5 rounded-full" aria-hidden="true" />
                    <div className="relative mx-auto max-w-6xl">
                        <h2 className="relative mb-3 font-display text-2xl font-semibold md:text-3xl">The Next Success Story Could Be Yours!</h2>
                        <p className="relative mx-auto mb-8 max-w-xl text-sm text-slate-300 md:text-base">
                            Join the next generation of achievers at Shikhor Academy — expert mentors, regular evaluation, and a proven path to results.
                        </p>
                        <div className="relative flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                            to="/admission"
                            className="min-h-11 rounded-xl bg-brass px-7 py-3 text-sm font-semibold text-ink transition hover:bg-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                        >
                            Enroll Now
                        </Link>
                        <Link
                            to="/contact"
                            className="min-h-11 rounded-xl border border-white/30 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                        >
                            Contact Us
                        </Link>
                        </div>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}