import { useUpload } from "../../context/UploadContext";
import { FileText, X, ChevronUp, ChevronDown, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
};

export default function FloatingUploadWidget() {
    const {
        activeUploads,
        isWidgetOpen,
        removeUpload,
        clearCompleted,
        toggleWidget,
        hasActiveUploads
    } = useUpload();

    if (activeUploads.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[70] w-80 max-w-[calc(100vw-3rem)]">
            {/* Widget Header */}
            <div className="bg-[#1F4E79] text-white rounded-t-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <FileText size={16} />
                        <span className="text-sm font-bold">
                            Uploads ({activeUploads.filter(u => u.status === 'uploading').length} active)
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {activeUploads.some(u => u.status !== 'uploading') && (
                            <button
                                onClick={clearCompleted}
                                className="text-xs px-2 py-1 hover:bg-white/20 rounded transition"
                                title="Clear finished"
                            >
                                Clear
                            </button>
                        )}
                        <button onClick={toggleWidget} className="p-1 hover:bg-white/20 rounded transition" title={isWidgetOpen ? "Collapse" : "Expand"}>
                            {isWidgetOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Widget Body - Collapsible */}
            <AnimatePresence>
                {isWidgetOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden bg-white border border-t-0 border-gray-200 rounded-b-xl shadow-2xl"
                    >
                        <div className="max-h-72 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {activeUploads.map((upload) => (
                                <div key={upload.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {upload.status === 'completed' ? (
                                                <CheckCircle size={16} className="text-green-500 shrink-0" />
                                            ) : upload.status === 'failed' ? (
                                                <AlertCircle size={16} className="text-red-500 shrink-0" />
                                            ) : (
                                                <FileText size={16} className="text-[#1F4E79] shrink-0 animate-pulse" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-gray-800 truncate">{upload.title}</p>
                                                <p className="text-[10px] text-gray-400 truncate">
                                                    {upload.fileName}{upload.fileSize ? ` • ${formatSize(upload.fileSize)}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        {upload.status !== 'uploading' && (
                                            <button
                                                onClick={() => removeUpload(upload.id)}
                                                className="text-gray-300 hover:text-red-500 transition shrink-0"
                                                title="Dismiss"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ease-out ${
                                                    upload.status === 'failed' ? 'bg-red-500' :
                                                    upload.status === 'completed' ? 'bg-green-500' : 'bg-[#1F4E79]'
                                                }`}
                                                style={{ width: `${upload.status === 'failed' ? 100 : upload.progress}%` }}
                                            ></div>
                                        </div>
                                        <span className={`text-[10px] font-bold w-9 text-right ${
                                            upload.status === 'failed' ? 'text-red-500' :
                                            upload.status === 'completed' ? 'text-green-600' : 'text-[#1F4E79]'
                                        }`}>
                                            {upload.status === 'failed' ? '✕' :
                                             upload.status === 'completed' ? '✓' : `${upload.progress}%`}
                                        </span>
                                    </div>

                                    {/* Error message */}
                                    {upload.status === 'failed' && upload.error && (
                                        <p className="text-[10px] text-red-500 mt-1.5 break-words">{upload.error}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
