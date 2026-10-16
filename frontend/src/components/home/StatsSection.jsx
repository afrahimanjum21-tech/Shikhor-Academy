import { Users, GraduationCap, TrendingUp, Calendar, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import api from "../../services/api";

function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !hasAnimated) setHasAnimated(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;
    const numericValue = parseInt(value) || 0;
    if (numericValue === 0) { setCount(0); return; }
    const duration = 1800;
    const interval = 25;
    const steps = duration / interval;
    const increment = numericValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) { setCount(numericValue); clearInterval(timer); }
      else setCount(Math.round(current));
    }, interval);
    return () => clearInterval(timer);
  }, [hasAnimated, value]);

  return <span ref={ref} className="font-display text-4xl font-bold tabular-nums text-ink lg:text-5xl">{count}</span>;
}

const statTemplates = {
  students: { icon: Users, label: "Students", desc: "Trusted by families", suffix: "+" },
  teachers: { icon: GraduationCap, label: "Teachers", desc: "Experienced & dedicated", suffix: "+" },
  courses: { icon: BookOpen, label: "Courses", desc: "Active programs", suffix: "+" },
  successRate: { icon: TrendingUp, label: "Success rate", desc: "Proven results", suffix: "%" },
  established: { icon: Calendar, label: "Established", suffix: "" },
};

export default function StatsSection() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/public/site-settings')
      .then(({ data }) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="bg-paper py-9 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl animate-pulse grid-cols-2 gap-y-10 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="mx-auto mb-3 h-10 w-24 rounded bg-slate-200" />
              <div className="mx-auto h-4 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const currentYear = new Date().getFullYear();
  const establishedYear = settings?.established_year ||
    (settings?.years_experience ? currentYear - settings.years_experience : null);

  const stats = [];
  // I-8: honour the admin "Student Count" override, fall back to the real DB count.
  const studentCount = settings?.student_count > 0 ? settings.student_count : (settings?.real_student_count ?? 0);
  if (studentCount > 0) stats.push({ key: "students", ...statTemplates.students, value: studentCount });
  if (settings?.real_teacher_count > 0) stats.push({ key: "teachers", ...statTemplates.teachers, value: settings.real_teacher_count });
  if (settings?.real_course_count > 0) stats.push({ key: "courses", ...statTemplates.courses, value: settings.real_course_count });
  if (settings?.success_rate && Number(settings.success_rate) > 0) stats.push({ key: "successRate", ...statTemplates.successRate, value: Number(settings.success_rate) });
  if (establishedYear) stats.push({ key: "established", ...statTemplates.established, value: establishedYear, desc: `Quality education since ${establishedYear}` });

  if (stats.length === 0) return null;

  return (
    <section className="bg-paper py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-6 max-w-2xl text-center sm:mb-12">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-3xl lg:text-4xl">A track record families trust</h2>
          <p className="mt-1.5 text-xs text-slate-500 sm:mt-3 sm:text-base">Numbers that reflect years of consistent, measurable results.</p>
        </div>

        <div className="grid grid-cols-2 gap-y-6 sm:gap-y-12 lg:flex lg:items-stretch lg:justify-between lg:gap-0">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.08, duration: 0.5 }}
              className={`px-1 text-center sm:px-2 lg:flex-1 lg:px-8 ${idx > 0 ? "lg:border-l lg:border-slate-200" : ""}`}
            >
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brass-100 sm:mb-4 sm:h-11 sm:w-11">
                <stat.icon size={18} className="text-brass-600" aria-hidden="true" />
              </div>
              <div className="flex items-baseline justify-center">
                {stat.key === "established"
                  ? <span className="font-display text-3xl font-bold tabular-nums text-ink sm:text-4xl lg:text-5xl">{stat.value}</span>
                  : <AnimatedCounter value={stat.value} />}
                {stat.suffix && <span className="font-display text-xl font-bold text-brass sm:text-3xl lg:text-4xl">{stat.suffix}</span>}
              </div>
              <h3 className="mt-1 text-sm font-semibold text-ink sm:mt-2 sm:text-base">{stat.label}</h3>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
