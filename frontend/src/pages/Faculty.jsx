import { useEffect, useState } from "react";
import api from "../services/api";
import { User, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";

export default function Faculty() {
    const [teachers, setTeachers] = useState([]);

    useEffect(() => {
        api.get('/public/teachers').then(res => setTeachers(res.data));
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="min-h-screen bg-[#F8FAFC] py-12 px-4"
        >
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <motion.h1 
                        initial={{ y: -20 }} animate={{ y: 0 }}
                        className="text-4xl font-bold text-[#1F4E79]"
                    >
                        Expert Faculty
                    </motion.h1>
                    <p className="text-lg text-gray-600 mt-2">Mentors who guide you to success</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {teachers.map((teacher, idx) => (
                        <motion.div 
                            key={teacher.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group"
                        >
                            <div className="h-40 bg-[#E6EEF5] flex items-center justify-center group-hover:bg-[#1F4E79] transition-colors duration-300">
                                <User size={64} className="text-[#1F4E79] group-hover:text-white transition-colors duration-300" />
                            </div>
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-gray-800">{teacher.name}</h3>
                                <p className="text-[#1F4E79] font-medium text-sm">
                                    {teacher.teacher_profile?.designation || 'Teacher'}
                                </p>
                                <p className="text-xs text-gray-500 mb-4 uppercase">
                                    {teacher.teacher_profile?.subject || 'General'}
                                </p>
                                
                                <div className="space-y-2 border-t pt-3">
                                    <div className="flex gap-2 text-gray-600 text-sm items-center">
                                        <Mail size={14} className="text-[#1F4E79]"/> 
                                        <span className="truncate">{teacher.email}</span>
                                    </div>
                                    <div className="flex gap-2 text-gray-600 text-sm items-center">
                                        <Phone size={14} className="text-[#1F4E79]"/> 
                                        <span>{teacher.phone}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}