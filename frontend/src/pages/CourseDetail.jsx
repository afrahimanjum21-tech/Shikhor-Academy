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

function InfoCard({ icon, label, value }) {
  return (
    <div className="p-4 rounded-xl text-center bg-white/20 backdrop-blur border border-white/10">
      <div className="mx-auto mb-2 text-[#2563EB]">{icon}</div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-bold mt-0.5 text-gray-900">{value}</p>
    </div>
  );
}

function QuickInfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800 text-right ml-4 break-words max-w-[60%]">{value}</span>
    </div>
  );
}

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen relative">
      <PageBackground />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Back navigation */}
        <button onClick={() => navigate("/courses")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1F4E79] transition-colors mb-4 sm:mb-6">
          <ChevronLeft size={16} /> Back to Courses
        </button>

        {/* Hero + Content Card */}
        <div className="rounded-[20px] overflow-hidden bg-white/30 backdrop-blur-lg shadow-sm border border-white/20">
          {/* Hero Section */}
          <div className="relative">
            {course.thumbnail ? (
              <div className="relative w-full h-48 sm:h-64 md:h-[400px] lg:h-[420px] overflow-hidden">
                <img
                  src={buildAssetUrl(course.thumbnail)}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-full h-48 sm:h-56 md:h-72 bg-gradient-to-br from-[#1F4E79]/5 to-[#1F4E79]/10 flex items-center justify-center">
                <BookOpen size={80} className="text-[#1F4E79]/15" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-10">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: course.course_category?.color || "#1F4E79" }}>
                  {course.course_category?.name || course.category}
                </span>
                {course.is_featured && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-bold">
                    <Sparkles size={12} /> Featured
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                {course.title}
              </h1>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* Left - Main Content */}
            <div className="lg:col-span-2 p-4 sm:p-6 md:p-10">
              {/* Description */}
              {course.description && (
                <div className="mb-8 sm:mb-10">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">About This Course</h2>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{course.description}</p>
                </div>
              )}

              {/* Features */}
              {features.length > 0 && (
                <div className="mb-8 sm:mb-10">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">What You'll Get</h2>
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

              {/* Course Details Grid */}
              <div className="mb-8 sm:mb-10">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Course Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {course.duration && (
                    <InfoCard
                      icon={<Clock size={20} />}
                      label="Duration"
                      value={course.duration}
                    />
                  )}
                  {course.seats && (
                    <InfoCard
                      icon={<Users size={20} />}
                      label="Seats"
                      value={course.seats}
                    />
                  )}
                  {course.teacher_name && (
                    <InfoCard
                      icon={<UserCheck size={20} />}
                      label="Teacher"
                      value={course.teacher_name}
                    />
                  )}
                  {course.class_mode && (
                    <InfoCard
                      icon={<Monitor size={20} />}
                      label="Mode"
                      value={course.class_mode}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right - Sidebar */}
            <div className="lg:col-span-1 p-4 sm:p-6 md:p-10 bg-[#F8FAFC] border-t lg:border-t-0 lg:border-l border-gray-100">
              <div className="lg:sticky lg:top-24 space-y-6">
                {/* Price Card */}
                <div className="bg-white/30 backdrop-blur-lg rounded-2xl shadow-sm border border-white/20 p-5 sm:p-6">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Course Fee</p>
                  <div className="flex items-end gap-2 mb-6 flex-wrap">
                    {course.discount_price ? (
                      <>
                        <p className="text-3xl sm:text-4xl font-bold text-[#1F4E79]">৳{course.discount_price}</p>
                        <p className="text-lg sm:text-xl text-gray-400 line-through mb-0.5 sm:mb-1">৳{course.fee}</p>
                      </>
                    ) : (
                      <p className="text-3xl sm:text-4xl font-bold text-[#1F4E79]">৳{course.fee}</p>
                    )}
                  </div>

                  <Link to="/admission" className="block w-full">
                    <button className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1F4E79] text-white font-bold rounded-full hover:bg-[#1a3d66] transition-all duration-300 shadow-sm group/btn min-h-[48px]">
                      Enroll Now <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  </Link>
                </div>

                {/* Quick Info */}
                <div className="bg-white/30 backdrop-blur-lg rounded-2xl shadow-sm border border-white/20 p-5 sm:p-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">Quick Info</h3>
                  <div className="space-y-3">
                    {course.duration && (
                      <QuickInfoRow label="Duration" value={course.duration} />
                    )}
                    {course.seats && (
                      <QuickInfoRow label="Available Seats" value={course.seats} />
                    )}
                    {course.teacher_name && (
                      <QuickInfoRow label="Teacher" value={course.teacher_name} />
                    )}
                    {course.class_mode && (
                      <QuickInfoRow label="Class Mode" value={course.class_mode} />
                    )}
                    <QuickInfoRow label="Category" value={course.course_category?.name || course.category} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 sm:mt-12 text-center">
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
