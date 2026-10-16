import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import api from "../../services/api";
import LOGO from "../../images/uttoron-logo.png";

// One orchestrated entrance for the hero (the single page-load moment).
const container = { hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } };
const up = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };

export default function HeroSection() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get('/public/site-settings').then(({ data }) => setSettings(data)).catch(() => {});
  }, []);

  const currentYear = new Date().getFullYear();
  const establishedYear = settings?.established_year ||
    (settings?.years_experience ? currentYear - settings.years_experience : null);
  const siteName = settings?.site_name || "Shikhor Academy";
  const heading = settings?.hero_title || settings?.home_hero_title || "Where results speak louder than promises.";
  const description = settings?.hero_subtitle || settings?.home_hero_subtitle ||
    "Concept-based coaching, regular evaluation, and mentorship that turns effort into real results.";
  const successRate = settings?.success_rate && Number(settings.success_rate) > 0 ? Number(settings.success_rate) : null;

  const trustPoints = ["Expert faculty", "Weekly exams", "Digital library"];
  if (establishedYear) trustPoints.push(`Since ${establishedYear}`);

  return (
    <section className="relative overflow-hidden bg-ink text-white">
      {/* Depth: diagonal navy gradient + top-left light sheen + fine dot-grid + bottom vignette (no brass glows) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #21466A 0%, #14314C 40%, #0E2338 70%, #091A2B 100%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(1100px 560px at 12% -5%, rgba(255,255,255,0.10), transparent 60%)" }} />
        <div className="absolute inset-0 opacity-80"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="absolute inset-x-0 bottom-0 h-48" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.38), transparent)" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        <div className="grid items-center gap-7 sm:gap-14 lg:grid-cols-12">
          {/* LEFT — message + proof */}
          <motion.div className="lg:col-span-7" variants={container} initial="hidden" animate="visible">
            <motion.div variants={up}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-brass/30 bg-white/5 py-1 pl-2 pr-3 text-[11px] text-brass-100 sm:mb-7 sm:gap-2.5 sm:py-1.5 sm:pl-2.5 sm:pr-4 sm:text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
              ভর্তি চলছে · Admission open{establishedYear ? ` · since ${establishedYear}` : ""}
            </motion.div>

            <motion.p variants={up} className="mb-1 font-bangla text-base text-slate-300 sm:mb-3 sm:text-xl">{siteName}</motion.p>
            <motion.h1 variants={up}
              className="font-display text-[1.95rem] font-semibold leading-[1.08] tracking-[-0.01em] text-white sm:text-5xl lg:text-[3.9rem]">
              {heading}
            </motion.h1>

            <motion.p variants={up} className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:mt-6 sm:text-lg">
              {description}
            </motion.p>

            <motion.div variants={up} className="mt-5 grid grid-cols-2 gap-x-2 gap-y-2 sm:mt-7 sm:flex sm:flex-wrap sm:gap-x-6">
              {trustPoints.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 text-[11px] text-slate-200 sm:gap-2 sm:text-sm">
                  <Check size={13} className="text-brass" aria-hidden="true" /> {p}
                </span>
              ))}
            </motion.div>

            <motion.div variants={up} className="mt-6 flex flex-col gap-2.5 sm:mt-10 sm:flex-row sm:gap-4">
              <Link to="/admission"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brass px-6 text-sm font-semibold text-ink shadow-sm transition hover:bg-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:h-[56px] sm:px-8 sm:text-base">
                Admission open
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link to="/courses"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:h-[56px] sm:px-8 sm:text-base">
                Explore courses
              </Link>
            </motion.div>
          </motion.div>

          {/* RIGHT — image + a floating result proof */}
          <motion.div className="lg:col-span-5"
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}>
            <div className="relative mx-auto max-w-[220px] sm:max-w-[440px]">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex aspect-square items-center justify-center rounded-[22px] bg-paper p-5 shadow-card-lg sm:rounded-[28px] sm:p-12"
              >
                <img src={LOGO} alt={siteName} className="w-full max-w-[300px] object-contain" />
              </motion.div>
              {/* brass corner bracket */}
              <div className="pointer-events-none absolute -right-3 -top-3 h-20 w-20 rounded-tr-[28px] border-r-2 border-t-2 border-brass" aria-hidden="true" />
              {successRate && (
                <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl bg-paper px-3.5 py-2.5 shadow-card-lg ring-1 ring-slate-100">
                  <div className="font-display text-2xl font-bold text-ink">{successRate}%</div>
                  <div className="text-xs font-medium leading-tight text-slate-500">Success<br />rate</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
