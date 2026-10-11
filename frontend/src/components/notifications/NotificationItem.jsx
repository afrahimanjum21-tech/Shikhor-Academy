import { useState } from "react";
import { useNavigate } from "react-router-dom";

const levelColors = {
    critical: { bg: "#FEF2F2", dot: "#EF4444" },
    warning: { bg: "#FFFBEB", dot: "#F59E0B" },
    info: { bg: "#EFF6FF", dot: "#3B82F6" },
    success: { bg: "#F0FDF4", dot: "#22C55E" },
};

export default function NotificationItem({ notification, onMarkRead, onClose }) {
    const [hover, setHover] = useState(false);
    const navigate = useNavigate();
    const colors = levelColors[notification.level] || levelColors.info;

    const handleClick = () => {
        if (!notification.is_read && onMarkRead) {
            onMarkRead(notification);
        }
        if (onClose) onClose();
        if (notification.action_url) {
            navigate(notification.action_url);
        }
    };

    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 ${
                notification.is_read ? "" : ""
            }`}
            style={!notification.is_read ? { backgroundColor: colors.bg } : {}}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label={`${notification.title} - ${notification.body || ""}`}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                style={{ backgroundColor: `${colors.dot}15` }}
            >
                {notification.icon || "🔔"}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p
                        className="text-sm text-gray-900 truncate"
                        style={!notification.is_read ? { fontWeight: 600 } : { fontWeight: 500 }}
                    >
                        {notification.title}
                    </p>
                    {!notification.is_read && (
                        <span
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ backgroundColor: colors.dot }}
                        />
                    )}
                </div>
                {notification.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.body}</p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                    {notification.time_ago || notification.createdAt || notification.created_at || ""}
                </p>
            </div>
            {hover && !notification.is_read && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onMarkRead) onMarkRead(notification);
                    }}
                    className="flex-shrink-0 p-1 rounded hover:bg-gray-200/50 transition-colors"
                    aria-label="Mark as read"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 12 8 19 23 4"/></svg>
                </button>
            )}
        </div>
    );
}
