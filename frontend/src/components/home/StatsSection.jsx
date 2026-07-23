import { Users, GraduationCap, TrendingUp, Calendar } from "lucide-react";
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
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;
    const numericValue = parseInt(value) || 0;
    if (numericValue === 0) { setCount(0); return; }
    const duration = 2000;
    const interval = 25;
    const steps = duration / interval;
    const increment = numericValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setCount(numericValue);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, interval);
    return () => clearInterval(timer);
  }, [hasAnimated, value]);

  return (
    <span ref={ref} className="text-4xl lg:text-5xl font-bold text-[#1F4E79] tabular-nums">
      {count}
    </span>
  );
}

const statTemplates = {
  students: { icon: Users, label: "Students", desc: "Trusted by thousands", suffix: "+" },
  teachers: { icon: GraduationCap, label: "Teachers", desc: "Experienced & Dedicated", suffix: "+" },
  successRate: { icon: TrendingUp, label: "Success Rate", desc: "Proven Results", suffix: "%" },
  established: { icon: Calendar, label: "Established", suffix: "" },
};

function SkeletonCard() {
  return (
    <div className="text-center p-6 lg:p-8 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
      <div className="w-14 h-14 rounded-xl bg-gray-200 mx-auto mb-4" />
      <div className="h-10 w-24 bg-gray-200 rounded mx-auto mb-2" />
      <div className="h-5 w-20 bg-gray-200 rounded mx-auto mb-1" />
      <div className="h-4 w-32 bg-gray-200 rounded mx-auto" />
    </div>
  );
}

export default function StatsSection() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/public/site-settings')
      .then(({ data }) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </section>
    );
  }

  const currentYear = new Date().getFullYear();
  const establishedYear = settings?.established_year ||
    (settings?.years_experience ? currentYear - settings.years_experience : null);

  const stats = [];

  if (settings?.real_student_count > 0) {
    stats.push({
      key: "students",
      ...statTemplates.students,
      value: settings.real_student_count,
    });
  }

  if (settings?.real_teacher_count > 0) {
    stats.push({
      key: "teachers",
      ...statTemplates.teachers,
      value: settings.real_teacher_count,
    });
  }

  if (settings?.success_rate && Number(settings.success_rate) > 0) {
    stats.push({
      key: "successRate",
      ...statTemplates.successRate,
      value: Number(settings.success_rate),
    });
  }

  if (establishedYear) {
    stats.push({
      key: "established",
      ...statTemplates.established,
      value: establishedYear,
      desc: `Quality Education Since ${establishedYear}`,
    });
  }

  if (stats.length === 0) return null;

  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:gap-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }}
              className="text-center p-6 lg:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="w-14 h-14 rounded-xl bg-[#1F4E79]/5 flex items-center justify-center mx-auto mb-4">
                <stat.icon size={28} className="text-[#1F4E79]" aria-hidden="true" />
              </div>

              {stat.key === "established" ? (
                <span className="text-4xl lg:text-5xl font-bold text-[#1F4E79] tabular-nums">
                  {stat.value}
                </span>
              ) : (
                <AnimatedCounter value={stat.value} />
              )}
              {stat.suffix && (
                <span className="text-4xl lg:text-5xl font-bold text-[#1F4E79]">
                  {stat.suffix}
                </span>
              )}

              <h3 className="text-lg font-bold text-gray-800 mt-2">{stat.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
