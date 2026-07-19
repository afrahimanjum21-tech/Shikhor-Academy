export default function NotificationDot({ color = "#3B82F6", show = false }) {
    if (!show) return null;

    return (
        <span
            aria-label="Unread updates"
            style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: color,
                display: "inline-block",
                flexShrink: 0,
            }}
        />
    );
}
