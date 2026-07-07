import { Link } from "react-router-dom";
import { Users, BarChart3, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const HERO_IMAGE = "https://lh3.googleusercontent.com/d/12u2xImQMsoc7NnZZicOb9w3K2tefQW_m";

export default function Home() {
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-white font-sans flex flex-col items-center pt-8 md:pt-16 px-4"
        >
            <motion.h1 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-3xl md:text-6xl font-bold text-center mb-4 leading-tight text-[#1F4E79]">Turning Vision into Reality</motion.h1>
            <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-base md:text-xl text-gray-600 text-center max-w-3xl mb-8 leading-relaxed font-light">We deliver seamless, innovative solutions that not only meet your needs but exceed expectations.</motion.p>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 justify-center z-20">
                <Link to="/admission" className="w-full sm:w-auto">
                    {/* 🔥 ফিক্স: অ্যারো আইকন নেই */}
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-[#1F4E79] text-white px-10 py-3.5 rounded-full font-bold text-base shadow-lg hover:shadow-xl transition w-full text-center tracking-wide">ADMISSION</motion.button>
                </Link>
                <Link to="/courses" className="w-full sm:w-auto">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-white text-[#1F4E79] border-2 border-[#1F4E79] px-10 py-3.5 rounded-full font-bold text-base shadow-lg hover:bg-gray-50 transition w-full text-center tracking-wide">COURSES</motion.button>
                </Link>
            </motion.div>

            {/* 🔥 ফিক্স: ইমেজ ব্লেন্ডিং */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="w-full flex justify-center mt-8 md:mt-12 mb-16 relative">
                <div className="w-full max-w-4xl relative" style={{ maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' }}>
                    <img src={HERO_IMAGE} alt="Uttoron Coaching Center" className="w-full h-auto object-contain drop-shadow-sm"/>
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
        </motion.div>
    );
}