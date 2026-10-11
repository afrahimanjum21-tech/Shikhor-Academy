import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import { motion } from "framer-motion";
import {
  BookOpen, Clock, Users, UserCheck, Monitor, CheckCircle,
  ArrowRight, GraduationCap, ChevronLeft, Sparkles
} from "lucide-react";
import PageBackground from "../components/common/PageBackground";
import ShareButtons from "../components/common/ShareButtons";
import usePageMeta from "../hooks/usePageMeta";

function InfoCard({ icon, label, value }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl text-center bg-white border border-gray-100 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-[#1F4E79]/10 text-[#1F4E79] flex items-center justify-center mx-auto mb-3">
        {icon}
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm sm:text-base font-bold mt-1 text-gray-900 break-words">{value}</p>
    </div>
  );
}

function RelatedCourseCard({ course }) {
  return (
    <Link to={`/course/${course.slug}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-[#1F4E79]/30 transition-all duration-300">
      <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#1F4E79]/10 to-[#1F4E79]/5">
        {course.thumbnail ? (
          <img src={buildAssetUrl(course.thumbnail)} alt={course.title} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={32} className="text-[#1F4E79]/20" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-800 line-clamp-2 group-hover:text-[#1F4E79] transition-colors leading-snug">
          {course.title}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-[#1F4E79]">৳{course.discount_price || course.fee}</span>
          {course.discount_price && (
            <span className="text-xs text-gray-400 line-through">৳{course.fee}</span>
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
    title: course ? `${course.title} — Uttoron Coaching Centre` : "Course — Uttoron Coaching Centre",
    description: course
      ? (course.description?.slice(0, 155) || `Enroll in ${course.title} at Uttoron Coaching Centre.`)
      : "Course details at Uttoron Coaching Centre.",
    path: course ? `/course/${course.slug}` : "/courses",
    image: course?.thumbnail ? buildAssetUrl(course.thumbnail) : undefined,
  });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    api.get(`/public/courses/slug/${slug}`)
      .then(({ data }) => {
        if (!cancelled) setCourse(data);
      })
      .catch(() => {
        if (!cancelled) navigate("/courses");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
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
      <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="w-10 h-10 border-[3px] border-[#1F4E79] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const features = Array.isArray(course.features) ? course.features : [];
  const savings = course.discount_price ? Math.max(0, Number(course.fee) - Number(course.discount_price)) : 0;

  return (
    <div className="min-h-screen relative">
      <PageBackground />
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6 space-y-8 sm:space-y-10 lg:space-y-12">
        {/* Back navigation */}
        <button onClick={() => navigate("/courses")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1F4E79] transition-colors">
          <ChevronLeft size={16} /> Back to Courses
        </button>

        {/* Module 1 - Course header + thumbnail */}
        <section className="rounded-[20px] overflow-hidden bg-white/30 backdrop-blur-lg shadow-sm border border-white/20">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]">
            {/* Left - Course info */}
            <div className="p-4 sm:p-6 md:p-10 xl:p-12">
              <div className="flex flex-wrap items-center gap-2">
                {(course.CourseCategory?.name || course.category) && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor: course.CourseCategory?.color ? `${course.CourseCategory.color}15` : '#1F4E7915',
                      color: course.CourseCategory?.color || '#1F4E79',
                    }}>
                    {course.CourseCategory?.name || course.category}
                  </span>
                )}
                {course.is_featured && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                    <Sparkles size={12} /> Featured
                  </span>
                )}
              </div>

              <h1 className="mt-3 sm:mt-4 text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                {course.title}
              </h1>

              {course.description && (
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-500 leading-relaxed line-clamp-3">
                  {course.description}
                </p>
              )}

              <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                {course.duration && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock size={16} className="text-[#1F4E79]" /> {course.duration}
                  </span>
                )}
                {course.teacher_name && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <UserCheck size={16} className="text-[#1F4E79]" /> {course.teacher_name}
                  </span>
                )}
                {course.class_mode && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                    <Monitor size={16} className="text-[#1F4E79]" /> {course.class_mode}
                  </span>
                )}
              </div>

              <ShareButtons
                text={`${course.title} — Uttoron Coaching Centre`}
                url={`/course/${course.slug}`}
                className="mt-5"
              />
            </div>

            {/* Right - Thumbnail */}
            <div className="p-4 sm:p-6 md:p-10 xl:p-12 bg-[#F8FAFC] border-t lg:border-t-0 lg:border-l border-gray-100">
              <div className="w-full h-56 sm:h-72 lg:h-full lg:min-h-[320px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#1F4E79]/10 to-[#1F4E79]/5">
                {course.thumbnail ? (
                  <img
                    src={buildAssetUrl(course.thumbnail)}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={64} className="text-[#1F4E79]/15" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Module 2 - Content + enrollment sidebar */}
        <section className="rounded-[20px] overflow-hidden bg-white/30 backdrop-blur-lg shadow-sm border border-white/20">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
            {/* Left - Main Content */}
            <div className="p-4 sm:p-6 md:p-10 xl:p-12">
              {/* Description */}
              {course.description && (
                <div className="mb-8 sm:mb-10">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">About This Course</h2>
                  <p className="text-base leading-relaxed text-gray-600">{course.description}</p>
                </div>
              )}

              {/* Features */}
              {features.length > 0 && (
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">What You'll Learn</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {features.map((feat, idx) => (
                      <div key={`feat-${idx}`} className="flex items-center gap-3 p-3.5 bg-[#F8FAFC] rounded-xl border border-gray-100">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle size={16} className="text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right - Enrollment Sidebar */}
            <div className="p-4 sm:p-6 md:p-10 xl:p-12 bg-[#F8FAFC] border-t lg:border-t-0 lg:border-l border-gray-100">
              <div className="lg:sticky lg:top-24">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Course Fee</p>
                  <div className="flex items-end gap-2 flex-wrap mt-1">
                    {course.discount_price ? (
                      <>
                        <p className="text-3xl sm:text-4xl font-bold text-[#1F4E79]">৳{course.discount_price}</p>
                        <p className="text-lg sm:text-xl text-gray-400 line-through mb-0.5 sm:mb-1">৳{course.fee}</p>
                      </>
                    ) : (
                      <p className="text-3xl sm:text-4xl font-bold text-[#1F4E79]">৳{course.fee}</p>
                    )}
                  </div>
                  {savings > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold mt-3">
                      Save ৳{savings.toLocaleString()}
                    </span>
                  )}
                  {course.seats && (
                    <p className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                      <Users size={16} className="text-[#1F4E79]" /> {course.seats} Seats Available
                    </p>
                  )}

                  <Link to="/admission" className="block w-full mt-5">
                    <button className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1F4E79] text-white font-bold rounded-full hover:bg-[#1a3d66] transition-all duration-300 shadow-sm group/btn min-h-[48px]">
                      Enroll Now <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Course Details - full width */}
          <div className="p-4 sm:p-6 md:p-10 xl:p-12 border-t border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Course Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {course.duration && (
                <InfoCard
                  icon={<Clock size={20} />}
                  label="Duration"
                  value={course.duration}
                />
              )}
              {course.teacher_name && (
                <InfoCard
                  icon={<UserCheck size={20} />}
                  label="Instructor"
                  value={course.teacher_name}
                />
              )}
              {course.class_mode && (
                <InfoCard
                  icon={<Monitor size={20} />}
                  label="Class Mode"
                  value={course.class_mode}
                />
              )}
              {course.seats && (
                <InfoCard
                  icon={<Users size={20} />}
                  label="Seats"
                  value={`${course.seats} Students`}
                />
              )}
              {(course.CourseCategory?.name || course.category) && (
                <InfoCard
                  icon={<BookOpen size={20} />}
                  label="Category"
                  value={course.CourseCategory?.name || course.category}
                />
              )}
            </div>
          </div>

          {/* Features / Course Benefits */}
          {features.length > 0 && (
            <div className="p-4 sm:p-6 md:p-10 xl:p-12 border-t border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Features / Course Benefits</h2>
              <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-5 sm:p-6 sm:px-8 divide-y divide-gray-100">
                {features.map((feat, idx) => (
                  <div key={`benefit-${idx}`} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle size={14} className="text-green-600" />
                    </div>
                    <span className="text-sm sm:text-base text-gray-700">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Module 3 - Other Courses */}
        {related.length > 0 && (
          <section className="rounded-[20px] overflow-hidden bg-white/30 backdrop-blur-lg shadow-sm border border-white/20">
            <div className="p-4 sm:p-6 md:p-10 xl:p-12">
              <h2 className="text-center text-lg sm:text-xl font-bold text-gray-900 mb-6">You May Also Like</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {related.map((c) => (
                  <RelatedCourseCard key={c.id} course={c} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div className="text-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#1F4E79]/5 to-[#1F4E79]/10 rounded-2xl p-6 sm:p-10 border border-[#1F4E79]/10">
            <GraduationCap size={40} className="mx-auto mb-4 text-[#1F4E79]" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ready to Start Your Journey?</h2>
            <p className="text-gray-500 mb-6 max-w-lg mx-auto text-sm sm:text-base">Enroll today and take the first step toward academic excellence.</p>
            <Link to="/admission">
              <button className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#1F4E79] text-white font-bold rounded-full hover:bg-[#1a3d66] transition-all shadow-sm group/btn min-h-[48px]">
                Enroll Now <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}