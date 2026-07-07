import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Courses() {
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        api.get('/public/courses').then(res => setCourses(res.data));
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="min-h-screen bg-[#F8FAFC] font-sans py-12 px-4"
        >
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <motion.h1 
                        initial={{ y: -20 }} animate={{ y: 0 }}
                        className="text-4xl font-bold mb-3 text-[#1F4E79]"
                    >
                        Our Academic Programs
                    </motion.h1>
                    <p className="text-lg text-gray-600">Choose the right path for your bright future</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {courses.map((course, idx) => (
                        <motion.div 
                            key={course.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 flex flex-col group"
                        >
                            <div className="h-1.5 bg-[#1F4E79]"></div>
                            <div className="p-6 flex-1 flex flex-col">
                                <span className="text-xs font-bold px-3 py-1 rounded-full w-fit mb-4 uppercase tracking-wide bg-[#E6EEF5] text-[#1F4E79]">
                                    {course.category}
                                </span>
                                
                                <h3 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-[#1F4E79] transition">
                                    {course.title}
                                </h3>
                                
                                <p className="text-gray-600 text-sm mb-6 flex-1 line-clamp-3 leading-relaxed">
                                    {course.description}
                                </p>
                                
                                <div className="space-y-3 mb-8 border-t border-gray-100 pt-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <CheckCircle size={16} className="text-green-600" />
                                        <span>Expert Guidelines</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                        <CheckCircle size={16} className="text-green-600" />
                                        <span>Model Tests Included</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-auto">
                                    <div>
                                        <p className="text-xs text-gray-400 font-semibold uppercase">Course Fee</p>
                                        <p className="text-2xl font-bold text-[#1F4E79]">৳{course.fee}</p>
                                    </div>
                                    <Link to="/admission">
                                        <motion.button 
                                            whileTap={{ scale: 0.95 }}
                                            className="text-white px-6 py-2.5 rounded-lg font-bold bg-[#1F4E79] hover:bg-[#163859] transition shadow-md"
                                        >
                                            Enroll Now
                                        </motion.button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}