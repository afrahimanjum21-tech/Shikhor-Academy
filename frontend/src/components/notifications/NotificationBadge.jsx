export default function NotificationBadge({ count, dot = false }) {
    if (!count && !dot) return null;

    const display = count > 99 ? "99+" : count;

    return (
        <span
            aria-label={`${count || ""} notifications`}
            className="inline-flex items-center justify-center flex-shrink-0"
            style={{
                height: "18px",
                minWidth: "18px",
                padding: dot ? "0" : "2px 6px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 600,
                lineHeight: "1",
                letterSpacing: "0",
                backgroundColor: dot ? "transparent" : "#EF4444",
                color: "#fff",
            }}
        >
            {dot ? (
                <span
                    style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#3B82F6",
                        display: "inline-block",
                        flexShrink: 0,
                    }}
                />
            ) : (
                display
            )}
        </span>
    );
}
