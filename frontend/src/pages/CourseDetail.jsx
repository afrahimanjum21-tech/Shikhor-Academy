import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import { motion } from "framer-motion";
import {
  BookOpen, Clock, Users, UserCheck, Monitor, CheckCircle,
  ArrowRight, GraduationCap, ChevronLeft, Sparkles
} from "lucide-react";
import ShareButtons from "../components/common/ShareButtons";
import usePageMeta from "../hooks/usePageMeta";

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-paper p-4 text-center shadow-card sm:p-5">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brass-100 text-brass-600">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-words font-display text-sm font-bold text-ink sm:text-base">{value}</p>
    </div>
  );
}

function RelatedCourseCard({ course }) {
  return (
    <Link to={`/course/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-paper shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-brass/40 hover:shadow-card-lg">
      <div className="relative aspect-[4/3] overflow-hidden">
        {course.thumbnail ? (
          <img src={buildAssetUrl(course.thumbnail)} alt={course.title} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-ink to-ink-700">
            <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "18px 18px" }} aria-hidden="true" />
            <BookOpen size={38} className="relative text-white/25" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink transition-colors group-hover:text-primary">
          {course.title}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-base font-bold text-ink">৳{course.discount_price || course.fee}</span>
          {course.discount_price && (
            <span className="text-xs text-slate-400 line-through">৳{course.fee}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: course ? `${course.title} — Shikhor Academy` : "Course — Shikhor Academy",
    description: course
      ? (course.description?.slice(0, 155) || `Enroll in ${course.title} at Shikhor Academy.`)
      : "Course details at Shikhor Academy.",
    path: course ? `/course/${course.slug}` : "/courses",
    image: course?.thumbnail ? buildAssetUrl(course.thumbnail) : undefined,
  });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    api.get(`/public/courses/slug/${slug}`)
      .then(({ data }) => { if (!cancelled) setCourse(data); })
      .catch(() => { if (!cancelled) navigate("/courses"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  // Other Courses: prefer same-category courses, fill the grid with the rest.
  useEffect(() => {
    if (!course) return;
    let cancelled = false;
    api.get("/public/courses", { params: { limit: 12 } })
      .then(({ data }) => {
        if (cancelled) return;
        const list = (Array.isArray(data) ? data : data.data || [])
          .filter((c) => c.slug !== course.slug);
        const categoryId = course.CourseCategory?.id;
        const same = list.filter((c) => c.CourseCategory?.id === categoryId);
        const others = list.filter((c) => c.CourseCategory?.id !== categoryId);
        setRelated([...same, ...others].slice(0, 4));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [course]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-ink border-t-transparent" />
          <p className="text-sm text-slate-400">Loading course details…</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const features = Array.isArray(course.features) ? course.features : [];
  const savings = course.discount_price ? Math.max(0, Number(course.fee) - Number(course.discount_price)) : 0;
  const categoryName = course.CourseCategory?.name || course.category;

  return (
    <div className="min-h-screen font-sans">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <button onClick={() => navigate("/courses")}
          className="mb-4 inline-flex items-center gap-1.5 rounded text-sm text-slate-500 transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30">
          <ChevronLeft size={16} aria-hidden="true" /> Back to Courses
        </button>

        {/* Hero — restrained navy */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl bg-ink text-white"
        >
          <div className="pointer-events-none absolute inset-0 opacity-40"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:items-center lg:gap-10 lg:p-10">
            {/* Left */}
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2">
                {categoryName && (
                  <span className="inline-flex items-center rounded-full border border-brass/30 bg-brass/10 px-3 py-1 text-xs font-semibold text-brass-100">
                    {categoryName}
                  </span>
                )}
                {course.is_featured && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brass/30 bg-white/5 px-3 py-1 text-xs font-semibold text-brass-100">
                    <Sparkles size={12} aria-hidden="true" /> Featured
                  </span>
                )}
              </div>

              <h1 className="mt-4 font-display text-2xl font-semibold leading-tight sm:text-3xl lg:text-[2.6rem]">{course.title}</h1>

              {course.description && (
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 line-clamp-3 sm:text-base">{course.description}</p>
              )}

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                {course.duration && <span className="inline-flex items-center gap-1.5 text-sm text-slate-200"><Clock size={16} className="text-brass" aria-hidden="true" /> {course.duration}</span>}
                {course.teacher_name && <span className="inline-flex items-center gap-1.5 text-sm text-slate-200"><UserCheck size={16} className="text-brass" aria-hidden="true" /> {course.teacher_name}</span>}
                {course.class_mode && <span className="inline-flex items-center gap-1.5 text-sm text-slate-200"><Monitor size={16} className="text-brass" aria-hidden="true" /> {course.class_mode}</span>}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link to="/admission"
                  className="group inline-flex h-[52px] min-w-[200px] items-center justify-center gap-2 rounded-xl bg-brass px-8 font-semibold text-ink shadow-sm transition hover:bg-brass-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
                  Enroll now <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold text-white">৳{course.discount_price || course.fee}</span>
                  {course.discount_price && <span className="text-sm text-slate-400 line-through">৳{course.fee}</span>}
                </div>
              </div>
            </div>

            {/* Right — course visual */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto w-full max-w-md">
                {course.thumbnail ? (
                  <div className="overflow-hidden rounded-2xl bg-paper p-2 shadow-card-lg">
                    <img src={buildAssetUrl(course.thumbnail)} alt={course.title} loading="lazy"
                      className="aspect-[4/3] w-full rounded-xl object-cover" />
                  </div>
                ) : (
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <BookOpen size={64} className="text-white/20" aria-hidden="true" />
                  </div>
                )}
                <span className="pointer-events-none absolute -right-2 -top-2 h-14 w-14 rounded-tr-2xl border-r-2 border-t-2 border-brass/60" aria-hidden="true" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Key facts */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {course.duration && <InfoCard icon={<Clock size={20} aria-hidden="true" />} label="Duration" value={course.duration} />}
          {course.teacher_name && <InfoCard icon={<UserCheck size={20} aria-hidden="true" />} label="Instructor" value={course.teacher_name} />}
          {course.class_mode && <InfoCard icon={<Monitor size={20} aria-hidden="true" />} label="Class Mode" value={course.class_mode} />}
          {course.seats && <InfoCard icon={<Users size={20} aria-hidden="true" />} label="Seats" value={`${course.seats} Students`} />}
          {categoryName && <InfoCard icon={<BookOpen size={20} aria-hidden="true" />} label="Category" value={categoryName} />}
        </div>

        {/* Overview + enrollment */}
        <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-3 lg:gap-8">
          <div className="space-y-6 lg:col-span-2">
            {course.description && (
              <div className="rounded-2xl border border-slate-200/80 bg-paper p-6 shadow-card sm:p-8">
                <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">About this course</h2>
                <div className="mt-3 h-px w-12 bg-brass" aria-hidden="true" />
                <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-600">{course.description}</p>
              </div>
            )}
            {features.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-paper p-6 shadow-card sm:p-8">
                <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">What you&apos;ll learn</h2>
                <div className="mt-3 h-px w-12 bg-brass" aria-hidden="true" />
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {features.map((feat, idx) => (
                    <div key={`feat-${idx}`} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-paper px-4 py-3">
                      <CheckCircle size={18} className="mt-0.5 flex-shrink-0 text-brass-600" aria-hidden="true" />
                      <span className="text-sm font-medium text-slate-700">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200/80 bg-paper p-6 shadow-card lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Course fee</p>
              <div className="mt-1 flex flex-wrap items-end gap-2">
                {course.discount_price ? (
                  <>
                    <span className="font-display text-3xl font-bold text-ink sm:text-4xl">৳{course.discount_price}</span>
                    <span className="mb-1 text-lg text-slate-400 line-through">৳{course.fee}</span>
                  </>
                ) : (
                  <span className="font-display text-3xl font-bold text-ink sm:text-4xl">৳{course.fee}</span>
                )}
              </div>
              {savings > 0 && (
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-brass-100 px-2.5 py-1 text-xs font-bold text-brass-600">
                  Save ৳{savings.toLocaleString()}
                </span>
              )}
              {course.seats && (
                <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                  <Users size={16} className="text-brass-600" aria-hidden="true" /> {course.seats} seats available
                </p>
              )}
              <Link to="/admission" className="mt-5 block">
                <button className="group inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brass px-6 font-semibold text-ink shadow-sm transition hover:bg-brass-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2">
                  Enroll now <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </Link>
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-medium text-slate-400">Share this course</p>
                <ShareButtons text={`${course.title} — Shikhor Academy`} url={`/course/${course.slug}`} />
              </div>
            </div>
          </aside>
        </div>

        {/* Other courses */}
        {related.length > 0 && (
          <section className="mt-10 sm:mt-14">
            <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">You may also like</h2>
            <div className="mt-3 h-px w-12 bg-brass" aria-hidden="true" />
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((c) => (
                <RelatedCourseCard key={c.id} course={c} />
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <motion.section
          initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}
          className="relative mt-10 overflow-hidden rounded-3xl bg-ink text-white sm:mt-14"
        >
          <div className="pointer-events-none absolute inset-0 opacity-40"
            style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
          <div className="relative px-6 py-12 text-center sm:px-10 sm:py-14">
            <GraduationCap size={40} className="mx-auto mb-4 text-brass" aria-hidden="true" />
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Ready to start your journey?</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
              Enroll today and take the first step toward academic excellence.
            </p>
            <Link to="/admission" className="mt-7 inline-block">
              <button className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-brass px-8 font-semibold text-ink shadow-sm transition hover:bg-brass-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
                Enroll now <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </button>
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
