import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../services/api";
import NotificationItem from "./NotificationItem";
import { useNotificationCounts } from "../../context/NotificationContext";

export default function NotificationDropdown({ open, onClose, triggerRef }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const dropdownRef = useRef(null);
    const { markNotificationRead, markNotificationAllRead } = useNotificationCounts();

    const fetch = useCallback((offset = 0, append = false) => {
        if (!open) return;
        setLoading(true);
        const limit = 10;
        api.get("/notifications", { params: { limit, offset } })
            .then(({ data }) => {
                const items = data?.data || (Array.isArray(data) ? data : []);
                const total = data?.total ?? items.length;
                setNotifications(prev => append ? [...prev, ...items] : items);
                setHasMore((offset + items.length) < total);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [open]);

    useEffect(() => {
        if (open) {
            fetch(0);
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
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (typeof id === 'number') {
            markNotificationRead(id);
        }
        if (hasMore && notifications.length === 1) {
            fetch(0);
        }
    };

    const handleMarkAllRead = () => {
        markNotificationAllRead();
        setNotifications([]);
        setHasMore(false);
    };

    const loadMore = () => {
        fetch(notifications.length, true);
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
