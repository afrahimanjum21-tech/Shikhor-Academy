import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Star, ArrowRight } from "lucide-react";
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
    title: "Uttoron Coaching Centre — HSC, SSC & English Coaching in Bangladesh",
    description: "Uttoron Coaching Centre offers quality HSC, SSC and English coaching with experienced teachers and proven academic results. Enroll today.",
    path: "/",
  });
  const [featuredFaculty, setFeaturedFaculty] = useState([]);

  useEffect(() => {
    fetchFeaturedFaculty();
  }, []);

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
        <section className="bg-white pt-4 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-[#1F4E79] mb-2">Featured Faculty</h2>
                <p className="text-gray-600">Meet our distinguished educators</p>
              </div>
              <Link to="/faculty" className="hidden sm:flex items-center gap-2 text-[#1F4E79] hover:text-[#163859] font-medium transition-colors">
                View All <ArrowRight size={20} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredFaculty.map((fac, idx) => (
                <Link key={fac.id} to={`/faculty/${fac.slug}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group cursor-pointer"
                  >
                    <div className="h-40 bg-[#E6EEF5] flex items-center justify-center group-hover:bg-[#1F4E79] transition-colors duration-300 relative">
                      {fac.profile_photo_path ? (
                        <img
                          src={buildAssetUrl(fac.profile_photo_path)}
                          alt={fac.full_name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users size={64} className="text-[#1F4E79] group-hover:text-white transition-colors duration-300" />
                      )}
                      <div className="absolute top-2 right-2">
                        <Star size={18} className="text-yellow-500 fill-yellow-500" />
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-gray-800">{fac.full_name}</h3>
                      <p className="text-[#1F4E79] text-sm font-medium">{fac.designation}</p>
                      {fac.department && (
                        <p className="text-xs text-gray-500 mt-1">{fac.department.name}</p>
                      )}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center sm:hidden">
              <Link to="/faculty" className="inline-flex items-center gap-2 text-[#1F4E79] font-medium">
                View All Faculty <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
