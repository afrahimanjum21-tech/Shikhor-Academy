import { useEffect, useState } from "react";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, BookOpen, Users, Award, BookX, Sparkles, ArrowRight } from "lucide-react";
import usePageMeta from "../hooks/usePageMeta";

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-paper shadow-card animate-pulse">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="space-y-2.5 p-4">
        <div className="h-3 w-20 rounded-full bg-slate-200" />
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-200" />
        <div className="h-4 w-16 rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function Courses() {
  usePageMeta({
    title: "Our Courses — Shikhor Academy",
    description: "Browse HSC Science, Arts, Commerce and English courses at Shikhor Academy. View course details, fees and enroll online.",
    path: "/courses",
  });
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [coursesRes, categoriesRes, statsRes] = await Promise.all([
          api.get("/public/courses"),
          api.get("/public/course-categories"),
          api.get("/public/course-stats"),
        ]);
        setCourses(coursesRes.data);
        setCategories(categoriesRes.data);
        setStats(statsRes.data);
      } catch (err) {
        setError("Failed to load courses. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategoryId || course.CourseCategory?.id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  const statCards = [
    { icon: BookOpen, value: stats?.courses ?? "—", label: "Courses" },
    { icon: Users, value: stats?.students ?? "—", label: "Students" },
    { icon: Award, value: stats?.teachers ?? "—", label: "Teachers" },
    { icon: Sparkles, value: stats?.success_rate != null ? `${stats.success_rate}%` : "—", label: "Success Rate" },
  ];

  return (
    <div className="min-h-screen font-sans">
      {/* Header — navy band (segment colour, like Home) */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 lg:py-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
            <p className="mb-1 font-bangla text-sm text-brass-100">আমাদের কোর্সসমূহ</p>
            <h1 className="font-display text-[1.7rem] font-semibold leading-tight sm:text-[2rem]">Our Academic Programs</h1>
            <div className="mx-auto mt-3 h-px w-12 bg-brass" aria-hidden="true" />
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
              Discover the perfect course designed to help you achieve academic excellence.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Search */}
        <div className="mx-auto mb-5 max-w-xl">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-paper py-3 pl-11 pr-4 text-sm text-ink placeholder-slate-400 shadow-sm transition-all duration-300 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="mb-9 flex flex-wrap justify-center gap-2.5">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              !selectedCategoryId
                ? "bg-ink text-white shadow-sm"
                : "border border-slate-200 bg-paper text-slate-600 hover:border-brass hover:text-ink"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                selectedCategoryId === cat.id
                  ? "bg-ink text-white shadow-sm"
                  : "border border-slate-200 bg-paper text-slate-600 hover:border-brass hover:text-ink"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Stats row */}
        {stats && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5"
          >
            {statCards.map((card) => (
              <motion.div
                key={card.label}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="rounded-2xl border border-slate-200/80 bg-paper p-5 text-center shadow-card"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-white">
                  <card.icon size={22} aria-hidden="true" />
                </div>
                <p className="font-display text-2xl font-bold text-ink md:text-3xl">
                  {card.label === "Success Rate"
                    ? card.value
                    : card.value != null && card.value !== "—" ? `${card.value}+` : "—"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">{card.label}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Course grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-red-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-ink px-6 py-2 text-sm font-semibold text-white transition hover:bg-ink-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-paper text-slate-400">
              <BookX size={32} aria-hidden="true" />
            </div>
            <h3 className="mb-2 font-display text-xl font-semibold text-ink">
              {searchTerm || selectedCategoryId ? "No courses found" : "No courses available"}
            </h3>
            <p className="mx-auto max-w-md text-slate-500">
              {searchTerm || selectedCategoryId
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Courses are coming soon. Please check back later."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course, idx) => (
              <Link to={`/course/${course.slug}`} key={course.id} className="group">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, delay: Math.min(idx * 0.06, 0.4) }}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-paper shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-brass/40 hover:shadow-card-lg"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {course.thumbnail ? (
                      <img
                        src={buildAssetUrl(course.thumbnail)}
                        alt={course.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-ink to-ink-700">
                        <div
                          className="absolute inset-0 opacity-[0.14]"
                          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
                          aria-hidden="true"
                        />
                        <BookOpen size={46} className="relative text-white/25 transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
                        <span className="pointer-events-none absolute -right-2 -top-2 h-12 w-12 rounded-tr-2xl border-r-2 border-t-2 border-brass/50" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    {course.CourseCategory?.name && (
                      <span
                        className="self-start rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: course.CourseCategory.color ? `${course.CourseCategory.color}15` : "#0E233815",
                          color: course.CourseCategory.color || "#0E2338",
                        }}
                      >
                        {course.CourseCategory.name}
                      </span>
                    )}
                    <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-primary">
                      {course.title}
                    </h3>
                    <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">
                      {course.description}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {course.discount_price ? (
                          <>
                            <span className="font-display text-base font-bold text-ink">৳{course.discount_price}</span>
                            <span className="text-xs text-slate-400 line-through">৳{course.fee}</span>
                          </>
                        ) : (
                          <span className="font-display text-base font-bold text-ink">৳{course.fee}</span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-brass-600 transition-all duration-300 group-hover:gap-2">
                        View <ArrowRight size={13} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
