import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import logger from '../services/logger';
import HeroSection from "../components/home/HeroSection";
import StatsSection from "../components/home/StatsSection";
import FeatureCards from "../components/home/FeatureCards";
import SuccessStories from "../components/home/SuccessStories";
import usePageMeta from "../hooks/usePageMeta";

export default function Home() {
  usePageMeta({
    title: "Shikhor Academy — HSC, SSC & English Coaching in Bangladesh",
    description: "Shikhor Academy offers quality HSC, SSC and English coaching with experienced teachers and proven academic results. Enroll today.",
    path: "/",
  });
  const [featuredFaculty, setFeaturedFaculty] = useState([]);

  useEffect(() => { fetchFeaturedFaculty(); }, []);

  const fetchFeaturedFaculty = async () => {
    try {
      const { data } = await api.get('/public/faculty/featured');
      setFeaturedFaculty((data || []).slice(0, 4));
    } catch (error) {
      logger.error('Failed to fetch featured faculty:', error);
    }
  };

  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeatureCards />
      <SuccessStories />

      {featuredFaculty.length > 0 && (
        <section className="bg-paper py-9 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-display text-xl font-semibold text-ink sm:text-3xl lg:text-4xl">Our faculty</h2>
                <p className="mt-1.5 text-xs text-slate-500 sm:mt-3 sm:text-base">The experienced educators behind every result.</p>
              </div>
              <Link to="/faculty" className="inline-flex items-center gap-2 whitespace-nowrap font-semibold text-primary transition-colors hover:text-brass-600">
                View all faculty <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
              {featuredFaculty.map((fac, idx) => (
                <Link key={fac.id} to={`/faculty/${fac.slug}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: idx * 0.08, duration: 0.5 }}
                    className="group h-full overflow-hidden rounded-2xl border border-slate-100 bg-paper shadow-card transition-shadow hover:shadow-card-lg"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-ink/5">
                      {fac.profile_photo_path ? (
                        <img src={buildAssetUrl(fac.profile_photo_path)} alt={fac.full_name} loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Users size={56} className="text-ink/30" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 sm:p-5">
                      <h3 className="font-semibold text-ink">{fac.full_name}</h3>
                      <p className="text-sm font-medium text-brass-600">{fac.designation}</p>
                      {fac.department && <p className="mt-1 text-xs text-slate-400">{fac.department.name}</p>}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing admission CTA */}
      <section className="bg-ink">
        <div className="mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 sm:py-16 lg:py-20">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl lg:text-[2.6rem]">Ready to begin your preparation?</h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-300 sm:mt-4 sm:text-lg">
            Admission is open. Join Shikhor Academy and study with a team that measures its work by your results.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:mt-9 sm:flex-row sm:gap-4">
            <Link to="/admission" className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brass px-6 text-sm font-semibold text-ink shadow-lg transition hover:bg-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:h-[56px] sm:px-8 sm:text-base">
              Apply for admission
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link to="/contact" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-ink sm:h-[56px] sm:px-8 sm:text-base">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
