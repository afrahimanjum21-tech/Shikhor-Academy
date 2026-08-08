export default function LoadingScreen() {
    return (
        <div className="fixed inset-x-0 top-0 z-[9999] h-1 bg-[#E6EEF5]" aria-label="Loading">
            <div className="h-full w-1/3 animate-[loading-slide_1s_ease-in-out_infinite] bg-[#1F4E79]" />
        </div>
    );
}
