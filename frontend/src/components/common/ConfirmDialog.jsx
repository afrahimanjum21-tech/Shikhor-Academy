import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null);
    const resolveRef = useRef(null);

    const confirm = useCallback(({ title, message, confirmText = "Confirm", cancelText = "Cancel", variant = "destructive" }) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setState({ title, message, confirmText, cancelText, variant });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        const res = resolveRef.current;
        setState(null);
        resolveRef.current = null;
        if (res) res(true);
    }, []);

    const handleCancel = useCallback(() => {
        const res = resolveRef.current;
        setState(null);
        resolveRef.current = null;
        if (res) res(false);
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <AnimatePresence>
                {state && (
                    <ConfirmDialogView
                        {...state}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                    />
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return ctx;
}

function ConfirmDialogView({ title, message, confirmText, cancelText, variant, onConfirm, onCancel }) {
    const confirmRef = useRef(null);
    const cancelRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Tab" && confirmRef.current && cancelRef.current) {
                if (e.shiftKey && document.activeElement === confirmRef.current) {
                    e.preventDefault();
                    cancelRef.current.focus();
                } else if (!e.shiftKey && document.activeElement === cancelRef.current) {
                    e.preventDefault();
                    confirmRef.current.focus();
                }
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onCancel]);

    useEffect(() => {
        cancelRef.current?.focus();
    }, []);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const isDestructive = variant === "destructive";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.15 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 z-10"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isDestructive ? "bg-red-100" : "bg-blue-100"}`}>
                        <AlertTriangle size={20} className={isDestructive ? "text-red-600" : "text-blue-600"} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 id="confirm-title" className="text-lg font-semibold text-gray-900">
                            {title}
                        </h2>
                        {message && (
                            <p className="mt-1 text-sm text-gray-500">
                                {message}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onCancel}
                        className="shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        ref={cancelRef}
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                            isDestructive
                                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                : "bg-[#1F4E79] hover:bg-[#163859] focus:ring-[#1F4E79]"
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
