import { Link } from "react-router-dom";
import { GraduationCap, Award, BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: GraduationCap, title: "Expert faculty", description: "Learn from experienced, dedicated teachers committed to every student's academic success.", to: "/faculty", label: "Meet the faculty" },
  { icon: Award, title: "Online results", description: "Check examination results and track academic progress anytime, from anywhere.", to: "/check-result", label: "View results" },
  { icon: BookOpen, title: "Digital library", description: "Access notes, study materials, previous questions and learning resources online.", to: "/library", label: "Browse library" },
];

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } };
const card = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };

export default function FeatureCards() {
  return (
    <section className="bg-paper py-9 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-2xl sm:mb-14">
          <h2 className="font-display text-xl font-semibold text-ink sm:text-3xl lg:text-4xl">Why families choose Shikhor Academy</h2>
          <p className="mt-1.5 text-sm text-slate-500 sm:mt-3 sm:text-lg">Everything a student needs for a focused, modern learning experience — in one place.</p>
        </div>

        <motion.div
          variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div
              key={f.title} variants={card}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-paper p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-brass/40 hover:shadow-card-lg sm:rounded-2xl sm:p-8"
            >
              {/* brass accent bar grows on hover */}
              <span className="absolute inset-x-0 top-0 h-[3px] w-0 bg-brass transition-all duration-300 group-hover:w-full" aria-hidden="true" />
              {/* oversized ghost glyph for depth */}
              <f.icon className="pointer-events-none absolute -bottom-6 -right-5 text-ink/[0.04]" size={160} aria-hidden="true" />

              <div className="relative flex flex-1 flex-col">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white shadow-sm transition-colors duration-300 group-hover:bg-brass group-hover:text-ink sm:mb-6 sm:h-14 sm:w-14">
                  <f.icon size={22} aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-ink sm:text-xl">{f.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500 sm:mt-2 sm:text-base">{f.description}</p>
                <Link
                  to={f.to}
                  className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 font-semibold text-primary transition-all duration-300 group-hover:gap-3 group-hover:text-brass-600 sm:mt-6"
                >
                  {f.label}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
