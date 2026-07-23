import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import FALLBACK_HERO from "../../images/hero-background.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

export default function HeroSection() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get('/public/site-settings')
      .then(({ data }) => setSettings(data))
      .catch(() => {});
  }, []);

  const currentYear = new Date().getFullYear();
  const establishedYear = settings?.established_year ||
    (settings?.years_experience ? currentYear - settings.years_experience : null);

  const siteName = settings?.site_name || "উত্তরণ কোচিং সেন্টার";
  const heading = settings?.hero_title || settings?.home_hero_title || "Learn with confidence. Succeed with Uttoron.";
  const description = settings?.hero_subtitle || settings?.home_hero_subtitle || "Concept-based coaching, regular evaluation, and supportive guidance for every student.";

  const trustPoints = [
    "Expert Faculty",
    "Weekly Exams",
    "Digital Library",
  ];

  if (establishedYear) {
    trustPoints.push(`Since ${establishedYear}`);
  }

  return (
    <section className="relative min-h-[720px] flex items-center overflow-hidden">
      {/* LAYER 1: Light blue-white gradient (top-left to bottom-right) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F7FBFF] via-[#ecf3fe] to-[#D9ECFF]" />

      {/* LAYER 2: Large radial glow behind hero */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(61,132,255,0.15) 0%, rgba(61,132,255,0.05) 40%, transparent 70%)",
            filter: "blur(180px)",
          }}
        />
      </div>

      {/* LAYER 3: Large translucent curved wave shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Wave 1 - top right */}
        <svg className="absolute -top-20 -right-20 w-[600px] h-[600px] opacity-[0.15]" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M600 0C500 50 400 150 350 250C300 350 250 400 200 500C150 600 100 650 50 700L0 700L0 0H600Z" fill="#3D84FF" />
        </svg>
        {/* Wave 2 - bottom left */}
        <svg className="absolute -bottom-40 -left-20 w-[700px] h-[700px] opacity-[0.12]" viewBox="0 0 700 700" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 700C100 650 200 550 300 450C400 350 450 300 500 200C550 100 600 50 650 0L700 0L700 700H0Z" fill="#3D84FF" />
        </svg>
        {/* Wave 3 - center right */}
        <svg className="absolute top-1/3 -right-32 w-[400px] h-[500px] opacity-[0.10]" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M400 0C350 80 300 180 250 250C200 320 150 380 100 450C50 520 25 560 0 600V0H400Z" fill="#3D84FF" />
        </svg>
      </div>

      {/* LAYER 4: Multiple blurred circular gradients - very low opacity */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[15%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-[#3D84FF]/[0.08] to-transparent blur-[100px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[250px] h-[250px] rounded-full bg-gradient-to-tr from-[#3D84FF]/[0.06] to-transparent blur-[80px]" />
        <div className="absolute top-[40%] left-[50%] w-[200px] h-[200px] rounded-full bg-gradient-to-r from-[#3D84FF]/[0.05] to-transparent blur-[60px]" />
        <div className="absolute top-[5%] left-[30%] w-[180px] h-[180px] rounded-full bg-gradient-to-bl from-[#3D84FF]/[0.07] to-transparent blur-[70px]" />
        <div className="absolute bottom-[10%] right-[25%] w-[220px] h-[220px] rounded-full bg-gradient-to-tl from-[#3D84FF]/[0.04] to-transparent blur-[90px]" />
      </div>

      {/* LAYER 5: Subtle white highlight from top center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[300px] pointer-events-none">
        <div className="w-full h-full" style={{
          background: "radial-gradient(ellipse at center top, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)",
        }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 py-20">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-center">
          {/* LEFT COLUMN ~55% */}
          <motion.div
            className="w-full lg:flex-[7]"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#1F4E79]/10 text-[#1F4E79] text-xs sm:text-sm font-semibold mb-6 tracking-wider uppercase"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F4E79]" aria-hidden="true" />
              WELCOME TO {siteName.toUpperCase()}
            </motion.div>

            {/* Heading */}
            <motion.h1
              variants={fadeUp}
              className="text-[40px] sm:text-5xl lg:text-6xl xl:text-[64px] font-extrabold text-[#174B87] leading-[1.05] mb-6 tracking-[-2px]"
            >
              {heading}
            </motion.h1>

            {/* Description */}
            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl lg:text-[22px] text-gray-600 leading-[1.7] max-w-[620px] mb-10"
            >
              {description}
            </motion.p>

            {/* Trust Points - vertical list */}
            <motion.div
              variants={fadeUp}
              className="space-y-4 mb-12"
            >
              {trustPoints.map((point, idx) => (
                <div key={idx} className="flex items-center gap-3 text-gray-700">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1F4E79]/10 flex items-center justify-center">
                    <Check size={16} className="text-[#1F4E79]" aria-hidden="true" />
                  </div>
                  <span className="text-sm sm:text-base lg:text-[22px] font-medium">{point}</span>
                </div>
              ))}
            </motion.div>

            {/* Buttons */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to="/admission" aria-label="Go to admission page">
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: "0 12px 35px rgba(31,78,121,0.3)" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full sm:w-auto bg-[#1F4E79] text-white px-10 h-[60px] rounded-[18px] font-bold text-lg shadow-lg hover:bg-[#163859] transition-colors inline-flex items-center justify-center gap-2 group cursor-pointer"
                >
                  Admission Open
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </motion.button>
              </Link>
              <Link to="/courses" aria-label="Browse our courses">
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: "0 8px 25px rgba(31,78,121,0.12)" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full sm:w-auto bg-white text-[#1F4E79] border-2 border-[#1F4E79]/30 px-10 h-[60px] rounded-[18px] font-bold text-lg hover:bg-[#F0F4F8] hover:border-[#1F4E79] transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  Courses
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          {/* RIGHT COLUMN ~45% - Hero Image Card */}
          <motion.div
            className="w-full lg:flex-[5] flex justify-center"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-full max-w-[600px] aspect-[1/1] rounded-[30px] overflow-hidden"
              style={{
                boxShadow: "0 25px 60px rgba(41,94,179,0.10)",
              }}
            >
              <img
                src={settings?.hero_bg_image ? buildAssetUrl(settings.hero_bg_image) : FALLBACK_HERO}
                alt={siteName}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(circle at center, transparent 50%, rgba(247,251,255,0.55) 100%)",
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
