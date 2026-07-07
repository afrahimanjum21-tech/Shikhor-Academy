import { useEffect, useState } from "react";
import api from "../../services/api";
import { Calendar, Flag, BookOpen, Star, Clock } from "lucide-react";

export default function AcademicCalendar() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/public/events')
           .then(res => setEvents(res.data))
           .catch(err => console.error(err))
           .finally(() => setLoading(false));
    }, []);

    const getEventStyle = (type) => {
        if (type === 'holiday') return { icon: Flag, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
        if (type === 'exam') return { icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };
        return { icon: Star, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" };
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                <Calendar size={28} /> Academic Calendar
            </h1>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                {loading ? (
                    <p className="text-center text-gray-500 py-10">Loading Calendar...</p>
                ) : events.length > 0 ? (
                    <div className="grid gap-4">
                        {events.map((event, index) => {
                            const style = getEventStyle(event.type);
                            const Icon = style.icon;
                            return (
                                <div key={index} className={`p-5 rounded-xl border ${style.border} flex flex-col md:flex-row items-start md:items-center gap-4 hover:shadow-md transition bg-white`}>
                                    
                                    {/* Icon Box */}
                                    <div className={`p-4 rounded-full ${style.bg} ${style.color}`}>
                                        <Icon size={24} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${style.bg} ${style.color}`}>
                                                {event.type}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800">{event.title}</h3>
                                        {event.description && (
                                            <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                                        )}
                                    </div>

                                    {/* Date Badge */}
                                    <div className="flex flex-col items-end min-w-[120px] text-right">
                                        <div className="flex items-center gap-2 text-[#1F4E79] font-bold bg-blue-50 px-3 py-1.5 rounded-lg">
                                            <Clock size={16} />
                                            <span>{new Date(event.date).toDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
                        <p className="text-gray-500 text-lg">No upcoming events found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}