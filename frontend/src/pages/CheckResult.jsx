import { Link } from "react-router-dom";
import { Award, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function CheckResult() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 font-sans">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100"
            >
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-[#E6EEF5] text-[#1F4E79]">
                    <Award size={40} />
                </div>
                <h1 className="text-2xl font-bold text-[#1F4E79] mb-3">Check Online Results</h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    To protect student privacy, results are available only in the Student Portal.
                </p>
                
                <div className="space-y-4">
                    <Link to="/login" state={{ from: "/student/results" }}>
                        <motion.button 
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            className="w-full bg-[#1F4E79] text-white py-3.5 rounded-lg font-bold shadow-md hover:bg-[#163859] transition flex items-center justify-center gap-2"
                        >
                            Login to View Result <ArrowRight size={18}/>
                        </motion.button>
                    </Link>
                    <Link to="/" className="block w-full text-gray-400 hover:text-[#1F4E79] font-medium transition text-sm mt-4">
                        Back to Home
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}