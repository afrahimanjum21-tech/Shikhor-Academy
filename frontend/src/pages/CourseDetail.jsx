import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import { motion } from "framer-motion";
import {
  BookOpen, Clock, Users, UserCheck, Monitor, CheckCircle,
  ArrowRight, GraduationCap, Award, ChevronLeft, Sparkles
} from "lucide-react";

export default function CourseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/public/courses/slug/${slug}`)
      .then(({ data }) => setCourse(data))
      .catch(() => navigate("/courses"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white" style={{ fontFamily: "Inter, Poppins, sans-serif" }}>
      {/* Back navigation */}
      <div className="max-w-[1200px] mx-auto px-6 pt-6">
        <button onClick={() => navigate("/courses")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1F4E79] transition-colors">
          <ChevronLeft size={16} /> Back to Courses
        </button>
      </div>

      {/* Hero Section */}
      <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-0">
        <div className="rounded-[20px] overflow-hidden bg-white shadow-sm border border-gray-100">
          <div className="relative">
            {course.thumbnail ? (
              <div className="w-full h-[320px] md:h-[420px] overflow-hidden">
                <img src={buildAssetUrl(course.thumbnail)} alt={course.title}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="w-full h-[240px] md:h-[300px] bg-gradient-to-br from-[#1F4E79]/5 to-[#1F4E79]/10 flex items-center justify-center">
                <BookOpen size={80} className="text-[#1F4E79]/15" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
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
              <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                {course.title}
              </h1>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* Left - Main Content */}
            <div className="lg:col-span-2 p-6 md:p-10">
              {/* Description */}
              {course.description && (
                <div className="mb-10">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">About This Course</h2>
                  <p className="text-gray-600 leading-relaxed text-base">{course.description}</p>
                </div>
              )}

              {/* Features */}
              {features.length > 0 && (
                <div className="mb-10">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">What You'll Get</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3.5 bg-[#F8FAFC] rounded-xl border border-gray-100">
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
              <div className="mb-10">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Course Details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {course.duration && (
                    <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#888888" }}>Duration</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: "#222222" }}>{course.duration}</p>
                    </div>
                  )}
                  {course.seats && (
                    <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#888888" }}>Seats</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: "#222222" }}>{course.seats}</p>
                    </div>
                  )}
                  {course.teacher_name && (
                    <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#888888" }}>Teacher</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: "#222222" }}>{course.teacher_name}</p>
                    </div>
                  )}
                  {course.class_mode && (
                    <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#FFFFFF" }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#888888" }}>Mode</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: "#222222" }}>{course.class_mode}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right - Sidebar */}
            <div className="lg:col-span-1 p-6 md:p-10 bg-[#F8FAFC] border-l border-gray-100">
              <div className="sticky top-24">
                {/* Price Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Course Fee</p>
                  <div className="flex items-end gap-2 mb-6">
                    {course.discount_price ? (
                      <>
                        <p className="text-4xl font-bold text-[#1F4E79]">৳{course.discount_price}</p>
                        <p className="text-xl text-gray-400 line-through mb-1">৳{course.fee}</p>
                      </>
                    ) : (
                      <p className="text-4xl font-bold text-[#1F4E79]">৳{course.fee}</p>
                    )}
                  </div>

                  <Link to="/admission">
                    <button className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-[#1F4E79] text-white font-bold rounded-full hover:bg-[#1a3d66] transition-all duration-300 shadow-sm group/btn">
                      Enroll Now <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  </Link>
                </div>

                {/* Quick Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">Quick Info</h3>
                  <div className="space-y-3">
                    {course.duration && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-semibold text-gray-800">{course.duration}</span>
                      </div>
                    )}
                    {course.seats && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Available Seats</span>
                        <span className="font-semibold text-gray-800">{course.seats}</span>
                      </div>
                    )}
                    {course.teacher_name && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Teacher</span>
                        <span className="font-semibold text-gray-800">{course.teacher_name}</span>
                      </div>
                    )}
                    {course.class_mode && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Class Mode</span>
                        <span className="font-semibold text-gray-800">{course.class_mode}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Category</span>
                      <span className="font-semibold text-gray-800">{course.course_category?.name || course.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-[1200px] mx-auto px-6 py-12 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#1F4E79]/5 to-[#1F4E79]/10 rounded-2xl p-10 border border-[#1F4E79]/10">
          <GraduationCap size={40} className="mx-auto mb-4 text-[#1F4E79]" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Start Your Journey?</h2>
          <p className="text-gray-500 mb-6 max-w-lg mx-auto">Enroll today and take the first step toward academic excellence.</p>
          <Link to="/admission">
            <button className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#1F4E79] text-white font-bold rounded-full hover:bg-[#1a3d66] transition-all shadow-sm group/btn">
              Enroll Now <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
