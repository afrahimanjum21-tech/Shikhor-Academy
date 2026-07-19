import { useEffect, useState } from "react";
import api from "../services/api";
import { Bell, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import HERO_IMAGE from "../images/hero-background.jpg";

export default function Notices() {
    const [notices, setNotices] = useState([]);

    useEffect(() => {
        api.get('/public/notices').then(res => setNotices(res.data)).catch(() => {});
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white font-sans">
            {/* Hero Header */}
            <div className="relative overflow-hidden">
                <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#1F4E79]/90 via-[#1F4E79]/85 to-[#1F4E79]/90"></div>
                <div className="max-w-7xl mx-auto px-4 py-16 md:py-20 relative z-10 text-center text-white">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-5 border border-white/20">
                            <Bell size={16} /> Announcements
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Notice Board</h1>
                        <p className="text-lg text-blue-100 max-w-2xl mx-auto">Latest updates and announcements from Uttoron Coaching Center</p>
                    </motion.div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-20 pb-16">
                {notices.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                            <Bell size={36} className="text-gray-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700">No notices yet</h3>
                        <p className="text-gray-400 text-sm mt-1">Check back later for updates</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {notices.map((notice) => (
                            <motion.div key={notice.id}
                                whileInView={{ opacity: 1, y: 0 }}
                                initial={{ opacity: 0, y: 30 }}
                                viewport={{ once: true, margin: "-40px" }}
                                transition={{ duration: 0.45 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 hover:shadow-md transition-shadow"
                                style={{ borderLeftColor: '#1F4E79' }}>
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-bold px-2 py-1 rounded uppercase"
                                            style={{
                                                backgroundColor: notice.type === 'urgent' ? '#fee2e2' : 'rgba(31, 79, 120, 0.1)',
                                                color: notice.type === 'urgent' ? '#b91c1c' : '#1F4E79'
                                            }}>
                                            {notice.type}
                                        </span>
                                        <h3 className="text-xl font-bold mt-3 text-gray-800">{notice.title}</h3>
                                        <p className="text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">{notice.description}</p>
                                    </div>
                                    <div className="flex-shrink-0 text-center bg-gray-50 p-3 rounded-lg min-w-[80px]">
                                        <Calendar size={20} className="mx-auto text-gray-400 mb-1" />
                                        <span className="text-xs font-bold text-gray-600 block whitespace-nowrap">{notice.date}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
