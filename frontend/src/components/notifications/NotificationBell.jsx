import { useState, useRef, useEffect } from "react";
import NotificationDropdown from "./NotificationDropdown";
import { useNotificationCounts } from "../../context/NotificationContext";

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [count, setCount] = useState(0);
    const bellRef = useRef(null);
    const { counts } = useNotificationCounts();

    useEffect(() => {
        if (counts?.notifications !== undefined) {
            setCount(counts.notifications);
        }
    }, [counts]);

    return (
        <div className="relative">
            <button
                ref={bellRef}
                onClick={() => setOpen(prev => !prev)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
                aria-label={`Notifications${count ? ` - ${count} unread` : ""}`}
                aria-expanded={open}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                {count > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center"
                        style={{
                            minWidth: "16px",
                            height: "16px",
                            padding: "1px 4px",
                            borderRadius: "999px",
                            backgroundColor: "#EF4444",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 700,
                            lineHeight: "1",
                            letterSpacing: "0",
                        }}
                    >
                        {count > 99 ? "99+" : count}
                    </span>
                )}
            </button>
            <NotificationDropdown
                open={open}
                onClose={() => setOpen(false)}
                triggerRef={bellRef}
                onCountChange={setCount}
            />
        </div>
    );
}
