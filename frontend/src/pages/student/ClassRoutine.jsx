import { useEffect, useState } from "react";
import api from "../../services/api";
import { CalendarDays, Clock, MapPin, User, AlertCircle } from "lucide-react";

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function ClassRoutine() {
    const [routine, setRoutine] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ব্যাকএন্ড থেকে রুটিন আনা হচ্ছে
        api.get('/student/routine')
           .then(res => setRoutine(res.data))
           .catch(err => console.error(err))
           .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-20 text-center text-[#1F4E79] font-bold">Loading Routine...</div>;

    // যদি কোনো ব্যাচ অ্যাসাইন না থাকে
    if (Object.keys(routine).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg shadow-sm border border-gray-200">
                <AlertCircle size={48} className="text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-700">No Routine Available</h2>
                <p className="text-gray-500 mt-2">You are not assigned to any batch yet. Please contact admin.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-3">
                <CalendarDays size={28} /> My Class Routine
            </h1>

            <div className="grid gap-6">
                {DAYS.map(day => (
                    <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Day Header */}
                        <div className="bg-[#1F4E79] px-6 py-3 text-white font-bold flex justify-between items-center">
                            <span className="text-lg">{day}</span>
                            <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{routine[day]?.length || 0} Classes</span>
                        </div>
                        
                        {/* Classes Grid */}
                        <div className="p-5">
                            {routine[day]?.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {routine[day].map((cls, idx) => (
                                        <div key={idx} className="bg-[#F8FAFC] p-4 rounded-lg border-l-4 border-[#1F4E79] hover:shadow-md transition group">
                                            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-[#1F4E79] transition">
                                                {cls.subject}
                                            </h3>
                                            
                                            <div className="space-y-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={16} className="text-orange-500"/> 
                                                    <span className="font-medium bg-orange-50 px-2 py-0.5 rounded text-orange-700">
                                                        {cls.start_time} - {cls.end_time}
                                                    </span>
                                                </div>
                                                {cls.teacher_name && (
                                                    <div className="flex items-center gap-2">
                                                        <User size={16} className="text-blue-500"/> 
                                                        <span>{cls.teacher_name}</span>
                                                    </div>
                                                )}
                                                {cls.room_no && (
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={16} className="text-green-600"/> 
                                                        <span>Room: {cls.room_no}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-400 italic bg-gray-50 rounded border border-dashed border-gray-200">
                                    No classes scheduled for today. Enjoy your break!
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}