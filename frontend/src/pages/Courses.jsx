import { useEffect, useState } from "react";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, BookOpen, GraduationCap, Users, Award, Clock, UserCheck, Monitor, CheckCircle, ArrowRight, BookX, Sparkles
} from "lucide-react";
import HERO_IMAGE from "../images/hero-background.jpg";

function DetailItem({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <Icon size={13} className="text-gray-400 flex-shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="pt-3 border-t border-gray-100">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

export default function Courses() {
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
      !selectedCategoryId || course.course_category?.id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  const statCards = [
    { icon: BookOpen, value: stats?.courses, label: "Courses" },
    { icon: Users, value: stats?.students, label: "Students" },
    { icon: Award, value: stats?.teachers, label: "Teachers" },
    { icon: Sparkles, value: stats?.success_rate, label: "Success Rate" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <img src={HERO_IMAGE} alt=""
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1F4E79]/90 via-[#1F4E79]/85 to-[#1F4E79]/90"></div>
        <div className="max-w-7xl mx-auto px-4 py-16 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-5 border border-white/20">
              <BookOpen size={16} /> Our Academic Programs
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Our Academic Programs
            </h1>
            <p className="text-lg text-blue-100/90 max-w-2xl mx-auto">
              Discover the perfect course designed to help you achieve academic excellence.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
        <div className="max-w-xl mx-auto mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white rounded-full border border-gray-200 shadow-sm text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] transition-all duration-300"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-10">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              !selectedCategoryId
                ? "bg-[#1F4E79] text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-[#1F4E79] hover:text-[#1F4E79]"
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
                  ? "bg-[#1F4E79] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-[#1F4E79] hover:text-[#1F4E79]"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Course Statistics Row */}
        {stats && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12"
          >
            {statCards.map((card, i) => (
              <motion.div
                key={card.label}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1F4E79]/10 text-[#1F4E79] mb-3">
                  <card.icon size={20} />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-gray-800">
                  {card.value ? `${card.value}+` : "—"}
                </p>
                <p className="text-sm text-gray-500 mt-1">{card.label}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Course Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 text-lg font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-[#1F4E79] text-white rounded-full text-sm font-semibold hover:bg-[#1a3d66] transition"
            >
              Try Again
            </button>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
              <BookX size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {searchTerm || selectedCategoryId
                ? "No courses found"
                : "No courses available"}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchTerm || selectedCategoryId
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Courses are coming soon. Please check back later."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filteredCourses.map((course, idx) => (
              <Link to={`/course/${course.slug}`} key={course.id}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: Math.min(idx * 0.08, 0.4) }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group transition-shadow duration-300 hover:shadow-md hover:border-[#1F4E79]/30 cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="relative overflow-hidden aspect-video bg-gradient-to-br from-[#1F4E79]/10 to-[#1F4E79]/5">
                  {course.thumbnail ? (
                    <img src={buildAssetUrl(course.thumbnail)} alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={48} className="text-[#1F4E79]/20" />
                    </div>
                  )}
                  <span
                    className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: course.course_category?.color || "#1F4E79" }}
                  >
                    {course.course_category?.name || course.category}
                  </span>
                  {course.is_featured && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 bg-amber-400 text-amber-900 rounded-full text-[10px] font-bold">
                      Featured
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-[#1F4E79] transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3 leading-relaxed flex-1">
                    {course.description}
                  </p>

                  {course.features?.length > 0 && (
                    <div className="border-t border-gray-100 pt-4 mb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {course.features.slice(0, 4).map((feat, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                        {course.features.length > 4 && (
                          <span className="text-xs text-gray-400">+{course.features.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Course Details Row */}
                  <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 mb-4">
                    {course.duration && <DetailItem icon={Clock} text={course.duration} />}
                    {course.seats && <DetailItem icon={Users} text={`${course.seats} Seats`} />}
                    {course.teacher_name && <DetailItem icon={UserCheck} text={course.teacher_name} />}
                    {course.class_mode && <DetailItem icon={Monitor} text={course.class_mode} />}
                  </div>

                  {/* Price + CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Course Fee</p>
                      <div className="flex items-center gap-2">
                        {course.discount_price ? (
                          <>
                            <p className="text-xl font-bold text-[#1F4E79]">৳{course.discount_price}</p>
                            <p className="text-sm text-gray-400 line-through">৳{course.fee}</p>
                          </>
                        ) : (
                          <p className="text-xl font-bold text-[#1F4E79]">৳{course.fee}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = '/admission'; }}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1F4E79] text-white text-sm font-semibold rounded-full hover:bg-[#1a3d66] transition-all duration-300 group/btn shadow-sm">
                      Enroll Now <ArrowRight size={15} className="transition-transform group-hover/btn:translate-x-0.5" />
                    </button>
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
