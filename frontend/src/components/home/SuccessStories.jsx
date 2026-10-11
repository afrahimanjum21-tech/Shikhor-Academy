import { useEffect, useState } from "react";
import { Trophy, Quote, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import logger from '../../services/logger';

export default function SuccessStories() {
    const [stories, setStories] = useState([]);

    useEffect(() => {
        api.get('/public/success-stories')
            .then(res => setStories(Array.isArray(res.data) ? res.data.slice(0, 6) : []))
            .catch(err => logger.error('Failed to fetch success stories:', err));
    }, []);

    if (stories.length === 0) return null;

    return (
        <section className="bg-[#F8FAFC] py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1F4E79]/10 text-[#1F4E79] text-xs font-bold uppercase tracking-wider mb-4">
                            <Trophy size={14} /> Our Achievements
                        </div>
                        <h2 className="text-3xl font-bold text-[#1F4E79] mb-2">Success Stories</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">Proud moments of our students — hard work turned into results</p>
                        <Link
                            to="/success-stories"
                            className="inline-flex items-center gap-1.5 mt-4 text-[#1F4E79] font-bold text-sm hover:underline"
                        >
                            See all success stories <ArrowRight size={15} />
                        </Link>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stories.map((story, idx) => (
                        <motion.div
                            key={story.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.08 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-md transition-shadow"
                        >
                            <Quote size={28} className="text-[#1F4E79]/20 mb-4" />
                            <p className="text-gray-600 leading-relaxed flex-1 line-clamp-5">{story.story}</p>
                            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100">
                                <div className="w-11 h-11 rounded-full overflow-hidden bg-[#E6EEF5] flex items-center justify-center flex-shrink-0">
                                    {story.photo ? (
                                        <img src={buildAssetUrl(story.photo)} alt={story.student_name} loading="lazy" className="w-full h-full object-cover" />
                                    ) : (
                                        <Trophy size={18} className="text-[#1F4E79]" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-800 text-sm">{story.student_name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {story.achievement && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 whitespace-nowrap">{story.achievement}</span>
                                        )}
                                        {story.batch_info && (
                                            <span className="text-xs text-gray-400 truncate">{story.batch_info}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}