export default function LoadingScreen() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="mx-auto w-10 h-10 border-4 border-[#1F4E79] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-500 text-sm">Loading...</p>
            </div>
        </div>
    );
}
