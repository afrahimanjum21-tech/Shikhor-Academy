import { useState, useEffect, useRef } from "react";
import api from "../../services/api";

const typeIcons = {
    admission: "📋",
    payment: "💰",
    message: "✉️",
    notice: "📢",
    routine: "📅",
    attendance: "✅",
    leave: "📝",
    assignment: "📚",
    exam: "📝",
    material: "📄",
    event: "🎉",
};

export default function RecentActivity({ limit = 5 }) {
    const [activities, setActivities] = useState([]);
    const [oldestCreatedAt, setOldestCreatedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState("");
    const intervalRef = useRef(null);

    useEffect(() => {
        api.get("/recent-activity")
            .then(({ data }) => {
                const items = data.items || data || [];
                setActivities((Array.isArray(items) ? items : []).slice(0, limit));
                setOldestCreatedAt(data.oldest_created_at || null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [limit]);

    useEffect(() => {
        if (!oldestCreatedAt) { setCountdown(""); return; }

        const update = () => {
            const expiresAt = new Date(oldestCreatedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const diff = expiresAt - now;
            if (diff <= 0) { setCountdown("Resetting..."); return; }

            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
            const secs = Math.floor((diff % (60 * 1000)) / 1000);

            if (days > 0) setCountdown(`${days}d ${hours}h ${mins}m ${secs}s`);
            else if (hours > 0) setCountdown(`${hours}h ${mins}m ${secs}s`);
            else if (mins > 0) setCountdown(`${mins}m ${secs}s`);
            else setCountdown(`${secs}s`);
        };

        update();
        intervalRef.current = setInterval(update, 1000);
        return () => clearInterval(intervalRef.current);
    }, [oldestCreatedAt]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-[#1F4E79]" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                {countdown && (
                    <span className="text-[11px] text-gray-400 font-mono">
                        Resets in {countdown}
                    </span>
                )}
            </div>
            {activities.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-sm text-gray-400">No recent activity</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50">
                    {activities.map((act) => (
                        <div
                            key={act.id}
                            className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs">
                                {act.icon || typeIcons[act.type] || "🔔"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{act.title}</p>
                                {act.body && (
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{act.body}</p>
                                )}
                            </div>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0 ml-2">
                                {act.time_ago || formatTime(act.created_at)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function formatTime(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
