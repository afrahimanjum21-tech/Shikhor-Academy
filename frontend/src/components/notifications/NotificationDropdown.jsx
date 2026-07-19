import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../services/api";
import NotificationItem from "./NotificationItem";

export default function NotificationDropdown({ open, onClose, triggerRef, onCountChange }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const dropdownRef = useRef(null);

    const fetch = useCallback((p = 1, append = false) => {
        if (!open) return;
        setLoading(true);
        const params = { page: p, per_page: 10, unread: "true" };
        api.get("/notifications", { params })
            .then(({ data }) => {
                const items = data.notifications?.data || [];
                setNotifications(prev => append ? [...prev, ...items] : items);
                setHasMore(data.notifications?.current_page < data.notifications?.last_page);
                if (data.unread_count !== undefined && onCountChange) {
                    onCountChange(data.unread_count);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [open, onCountChange]);

    useEffect(() => {
        if (open) {
            setPage(1);
            fetch(1);
        } else {
            setNotifications([]);
        }
    }, [open, fetch]);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)
            ) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open, onClose, triggerRef]);

    const handleMarkRead = (id) => {
        setNotifications(prev => {
            const filtered = prev.filter(n => n.id !== id);
            if (onCountChange) onCountChange(filtered.length);
            return filtered;
        });
        api.post(`/notifications/${id}/read`).catch(() => {});
    };

    const handleMarkAllRead = () => {
        api.post("/notifications/read-all").then(() => {
            setNotifications([]);
            if (onCountChange) onCountChange(0);
        }).catch(() => {});
    };

    const loadMore = () => {
        const next = page + 1;
        setPage(next);
        fetch(next, true);
    };

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div
                ref={dropdownRef}
                className="fixed left-3 right-3 top-14 mt-2 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-[380px] bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden"
                style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    {notifications.length > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Mark all read
                        </button>
                    )}
                </div>

                <div className="max-h-[360px] overflow-y-auto">
                    {loading && notifications.length === 0 ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-[#1F4E79]" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 12 8 19 23 4"/></svg>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">You're all caught up!</p>
                            <p className="text-xs text-gray-400 mt-1">No new notifications.</p>
                        </div>
                    ) : (
                        <>
                            {notifications.map(n => (
                                <NotificationItem
                                    key={n.id}
                                    notification={n}
                                    onMarkRead={handleMarkRead}
                                    onClose={onClose}
                                />
                            ))}
                            {hasMore && (
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="w-full py-2.5 text-xs text-blue-600 hover:text-blue-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    {loading ? "Loading..." : "View all notifications"}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
