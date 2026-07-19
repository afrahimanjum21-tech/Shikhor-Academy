import { Link } from "react-router-dom";
import { Users, BarChart3, BookOpen, Star, Award, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import HERO_IMAGE from "../images/hero-background.jpg";
import logger from '../services/logger';

export default function Home() {
    const [featuredFaculty, setFeaturedFaculty] = useState([]);
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        fetchFeaturedFaculty();
        api.get('/public/site-settings')
            .then(({ data }) => setSettings(data))
            .catch(() => {});
    }, []);

    const fetchFeaturedFaculty = async () => {
        try {
            const { data } = await api.get('/public/faculty/featured?limit=4');
            setFeaturedFaculty(data);
        } catch (error) {
            logger.error('Failed to fetch featured faculty:', error);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-white font-sans flex flex-col items-center pt-8 md:pt-16 px-4"
        >
            <motion.h1 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-3xl md:text-6xl font-bold text-center mb-4 leading-tight text-[#1F4E79]">
                {settings?.home_hero_title || "Learn with confidence. Grow with knowledge. Succeed with Uttoron."}
            </motion.h1>
            <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-base md:text-xl text-gray-600 text-center max-w-3xl mb-8 leading-relaxed font-light">
                {settings?.home_hero_subtitle || "Concept-based coaching, regular evaluation, and supportive guidance for every student."}
            </motion.p>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 justify-center z-20">
                <Link to="/admission" className="w-full sm:w-auto">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-[#1F4E79] text-white px-10 py-3.5 rounded-full font-bold text-base shadow-lg hover:shadow-xl transition w-full text-center tracking-wide inline-flex items-center justify-center gap-2">ADMISSION <ArrowRight size={20} /></motion.button>
                </Link>
                <Link to="/courses" className="w-full sm:w-auto">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-white text-[#1F4E79] border-2 border-[#1F4E79] px-10 py-3.5 rounded-full font-bold text-base shadow-lg hover:bg-gray-50 transition w-full text-center tracking-wide">COURSES</motion.button>
                </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="w-full flex justify-center mt-8 md:mt-12 mb-16">
                <div className="w-full max-w-4xl relative">
                    <img src={HERO_IMAGE} alt="Uttoron Coaching Centre" className="w-full h-auto object-contain drop-shadow-sm"/>
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/60 to-transparent pointer-events-none" />
                </div>
            </motion.div>

            <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 px-2">
                {[{ title: "Expert Faculty", icon: Users, link: "/faculty", desc: "Meet our experienced mentors." }, { title: "Online Results", icon: BarChart3, link: "/check-result", desc: "Check your progress reports." }, { title: "Digital Library", icon: BookOpen, link: "/library", desc: "Download study materials." }].map((item, idx) => (
                    <Link key={idx} to={item.link}>
                        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} whileHover={{ y: -8, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }} className="group bg-white p-8 rounded-2xl border border-gray-200 text-center flex flex-col items-center h-full cursor-pointer hover:border-[#1F4E79] transition-colors">
                            <div className="mb-4 p-4 rounded-full bg-[#E6EEF5] group-hover:bg-[#1F4E79] transition-colors duration-300"><item.icon size={32} className="text-[#1F4E79] group-hover:text-white transition-colors duration-300" /></div>
                            <h3 className="text-lg font-bold mb-2 text-[#1F4E79]">{item.title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                        </motion.div>
                    </Link>
                ))}
            </div>

            {/* Featured Faculty Section */}
            {featuredFaculty.length > 0 && (
                <div className="max-w-6xl w-full mb-20 px-2">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-bold text-[#1F4E79] mb-2">Featured Faculty</h2>
                            <p className="text-gray-600">Meet our distinguished educators</p>
                        </div>
                        <Link to="/faculty" className="flex items-center gap-2 text-[#1F4E79] hover:text-[#1a3d66] font-medium transition-colors">
                            View All <ArrowRight size={20} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                </div>
            )}
        </motion.div>
    );
}
