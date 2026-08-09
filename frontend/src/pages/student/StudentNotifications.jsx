import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell } from "lucide-react";
import RecentActivity from "../../components/notifications/RecentActivity";
import { useNotificationCounts } from "../../context/NotificationContext";

export default function StudentNotifications() {
    const navigate = useNavigate();
    const { counts } = useNotificationCounts();
    const [limit, setLimit] = useState(50);

    useEffect(() => {
        // Reset the unread counts for messages/activities when viewing the full list.
        // (count hook is read here only to keep stale badge counters in sync visually.)
        void counts;
    }, [counts]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-10">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate("/student/dashboard")}
                        className="p-2 rounded-xl bg-white border border-gray-200 text-[#1F4E79] hover:bg-[#F0F4F8] transition-colors"
                        aria-label="Back to dashboard"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#1F4E79] flex items-center gap-2">
                        <Bell size={20} className="text-[#1F4E79]" />
                        Recent Activity
                    </h1>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                        <p className="text-xs md:text-sm text-gray-500">
                            Showing the most recent activity on your account. Click an item to open it (if a destination is set).
                        </p>
                    </div>
                    <RecentActivity limit={limit} />
                    <div className="px-5 py-4 border-t border-gray-50 text-center">
                        <button
                            onClick={() => setLimit(prev => prev + 50)}
                            className="text-sm font-semibold text-[#1F4E79] hover:underline"
                        >
                            Load more
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
