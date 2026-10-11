import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Loader2, Search, SortAsc, Trophy, ArrowRight, Award, CalendarDays, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import usePageMeta from "../hooks/usePageMeta";
import PageBackground from "../components/common/PageBackground";

const SITE_URL = "https://uttoron-coaching.vercel.app";
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
        title: "Success Stories — Uttoron Coaching Centre",
        description: "Meet our students — admissions to top universities, public exam results, and proud achievements at Uttoron Coaching Centre.",
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
            name: "Success Stories — Uttoron Coaching Centre",
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
        <div className="min-h-screen relative overflow-hidden">
            <PageBackground />

            {/* Hero */}
            <div className="max-w-7xl mx-auto px-4 pt-10 pb-6">
                <nav aria-label="Breadcrumb" className="mb-4">
                    <ol className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500">
                        <li><Link to="/" className="hover:text-[#1F4E79] transition font-medium">Home</Link></li>
                        <li aria-hidden="true" className="text-gray-300">/</li>
                        <li aria-current="page" className="text-[#1F4E79] font-semibold">Success Stories</li>
                    </ol>
                </nav>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1F4E79]/10 text-[#1F4E79] text-xs font-bold uppercase tracking-wider mb-4">
                        <Trophy size={14} /> Our Achievements
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1F4E79] mb-4">Our Success Stories</h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Real results from real students — admissions to top universities, outstanding public exam grades, and milestones that started here.
                    </p>
                </motion.div>

                {/* Search + Sort */}
                <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by student, achievement or batch…"
                            aria-label="Search success stories"
                            className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/20 shadow-sm"
                        />
                    </div>
                    <div className="relative">
                        <SortAsc size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            aria-label="Sort success stories"
                            className="w-full sm:w-auto appearance-none rounded-lg border border-gray-300 bg-white pl-10 pr-9 py-3 text-sm outline-none focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/20 shadow-sm text-gray-700 cursor-pointer"
                        >
                            {sortOptions.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-7xl mx-auto px-4 pb-16">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-[#1F4E79]">
                        <Loader2 size={28} className="animate-spin" />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="text-center py-20 bg-white/70 backdrop-blur rounded-2xl border border-gray-200">
                        <GraduationCap size={48} className="mx-auto text-[#1F4E79]/30 mb-4" />
                        <h2 className="text-xl font-bold text-gray-700 mb-1">
                            {search ? "No stories match your search" : "Stories are coming soon"}
                        </h2>
                        <p className="text-gray-500 text-sm max-w-md mx-auto">
                            {search
                                ? "Try a different name, achievement or batch."
                                : "We are collecting our students' achievements — check back soon."}
                        </p>
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="mt-5 rounded-lg bg-[#1F4E79] text-white px-5 py-2.5 text-sm font-bold hover:bg-[#163859] transition"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-500 mb-5 text-center" role="status">
                            Showing {visible.length} of {total} {total === 1 ? "story" : "stories"}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {visible.map((story, idx) => (
                                <motion.article
                                    key={story.id}
                                    role="article"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-30px" }}
                                    transition={{ duration: 0.4, delay: Math.min(idx % 4, 3) * 0.06 }}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-md hover:-translate-y-1 transition-all duration-200 group focus-within:ring-2 focus-within:ring-[#1F4E79]/40"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-[#E6EEF5] flex items-center justify-center flex-shrink-0">
                                            {story.photo ? (
                                                <img
                                                    src={buildAssetUrl(story.photo)}
                                                    alt={`${story.student_name} — Uttoron Coaching Centre`}
                                                    width={48}
                                                    height={48}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-[#1F4E79] font-bold text-base">{initials(story.student_name) || <Trophy size={18} />}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-800 leading-tight truncate">{story.student_name}</h3>
                                            {story.batch_info && (
                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <CalendarDays size={12} className="flex-shrink-0" /> {story.batch_info}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {story.achievement && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-green-100 text-green-700 text-xs font-bold mb-3 w-fit">
                                            <Award size={13} /> {story.achievement}
                                        </span>
                                    )}

                                    <p className="text-gray-600 text-sm leading-relaxed flex-1 line-clamp-3">{story.story || "…"}</p>

                                    <Link
                                        to={`/success-stories/${story.slug || story.id}`}
                                        aria-label={`Read the full story of ${story.student_name}`}
                                        className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1F4E79] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#163859] transition"
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
                                    className="inline-flex items-center gap-2 rounded-lg border-2 border-[#1F4E79] text-[#1F4E79] font-bold px-6 py-3 text-sm hover:bg-[#1F4E79] hover:text-white transition disabled:opacity-60"
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
            <section className="max-w-7xl mx-auto px-4 pb-20">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="rounded-2xl bg-gradient-to-r from-[#1F4E79] to-[#163859] text-white px-6 py-12 md:py-14 text-center relative overflow-hidden"
                >
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" aria-hidden="true" />
                    <div className="absolute -bottom-16 -left-10 w-64 h-64 bg-white/5 rounded-full" aria-hidden="true" />
                    <h2 className="text-2xl md:text-3xl font-bold mb-3 relative">The Next Success Story Could Be Yours!</h2>
                    <p className="text-white/80 max-w-xl mx-auto mb-8 relative text-sm md:text-base">
                        Join the next generation of achievers at Uttoron Coaching Centre — expert mentors, regular evaluation, and a proven path to results.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
                        <Link
                            to="/admission"
                            className="rounded-lg bg-white text-[#1F4E79] px-7 py-3 text-sm font-bold hover:bg-gray-100 transition"
                        >
                            Enroll Now
                        </Link>
                        <Link
                            to="/contact"
                            className="rounded-lg border border-white/60 text-white px-7 py-3 text-sm font-bold hover:bg-white/10 transition"
                        >
                            Contact Us
                        </Link>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}