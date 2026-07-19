import { useEffect, useState } from "react";
import api from "../../services/api";
import { ArrowRight, CalendarDays, Gamepad2, Loader2, Music, Palette, Trophy, Users } from "lucide-react";
import { useNotificationCounts } from "../../context/NotificationContext";
import { useLocation } from "react-router-dom";

const iconMap = [Trophy, Music, Palette, Users];

export default function ExtraCurricular() {
    const { markViewed } = useNotificationCounts();
    const pathname = useLocation().pathname;
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        markViewed(pathname.includes('attitude') ? 'attitude' : 'extra_curricular');
    }, [markViewed, pathname]);

    useEffect(() => {
        api.get("/public/events")
            .then((res) => {
                const eventActivities = res.data
                    .filter((event) => event.type === "event")
                    .map((event, index) => ({
                        id: event.id,
                        title: event.title,
                        desc: event.description || "Activity details will be announced by the institute.",
                        date: event.date,
                        icon: iconMap[index % iconMap.length],
                    }));
                setActivities(eventActivities);
                setError("");
            })
            .catch((err) => setError(err.response?.data?.message || "Unable to load activities"))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                    <Gamepad2 size={28} /> Extra Curricular Activities
                </h1>
                <p className="text-sm text-gray-500">Live activity updates from the academic calendar</p>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="p-10 text-center text-[#1F4E79] flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    Loading activities...
                </div>
            ) : activities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activities.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-lg hover:border-[#1F4E79] transition duration-300 flex flex-col h-full">
                                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-blue-50 text-[#1F4E79]">
                                    <Icon size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
                                <p className="text-gray-600 text-sm mb-6 flex-1 leading-relaxed">{item.desc}</p>
                                <div className="mt-auto border-t border-gray-100 pt-4 flex justify-between items-center gap-3">
                                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                        <CalendarDays size={14} />
                                        {new Date(item.date).toDateString()}
                                    </span>
                                    <span className="text-sm font-bold text-[#1F4E79] flex items-center gap-1">
                                        Details <ArrowRight size={16} />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
                    <CalendarDays className="mx-auto mb-3 text-gray-300" size={42} />
                    <h3 className="font-bold text-gray-700">No activities scheduled</h3>
                    <p className="text-sm text-gray-500 mt-1">New activities will appear here when admin adds event entries.</p>
                </div>
            )}
        </div>
    );
}
