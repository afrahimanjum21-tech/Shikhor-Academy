import { createContext, useContext, useState, useCallback, useRef } from "react";
import api from "../services/api";

const UploadContext = createContext(null);

export const UploadProvider = ({ children }) => {
    // activeUploads: [{ id, title, fileName, fileSize, progress, status, error }]
    const [activeUploads, setActiveUploads] = useState([]);
    const [isWidgetOpen, setIsWidgetOpen] = useState(true);
    const idCounter = useRef(0);

    const startUpload = useCallback(({ title, type, file, url, onSuccess, onError }) => {
        const uploadId = ++idCounter.current;

        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);

        if (type === 'file') {
            const fileExtension = file.name.split('.').pop();
            const safeName = `upload_${Date.now()}.${fileExtension}`;
            const renamedFile = new File([file], safeName, { type: file.type });
            formData.append('file', renamedFile);
        } else {
            formData.append('url', url);
        }

        const newUpload = {
            id: uploadId,
            title,
            type,
            fileName: type === 'file' ? file.name : url,
            fileSize: type === 'file' ? file.size : null,
            progress: 0,
            status: 'uploading',
            error: null,
        };

        setActiveUploads(prev => [...prev, newUpload]);
        setIsWidgetOpen(true);

        const updateUpload = (updates) => {
            setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, ...updates } : u));
        };

        api.post('/admin/materials', formData, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 600000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            onUploadProgress: (progressEvent) => {
                const percent = progressEvent.total
                    ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    : 0;
                updateUpload({ progress: percent });
            }
        }).then(() => {
            updateUpload({ progress: 100, status: 'completed' });
            if (onSuccess) onSuccess();
        }).catch((err) => {
            const msg = err.response?.data?.message || err.message || "Upload failed";
            updateUpload({ status: 'failed', error: msg });
            if (onError) onError(msg);
        });

        return uploadId;
    }, []);

    const removeUpload = useCallback((id) => {
        setActiveUploads(prev => prev.filter(u => u.id !== id));
    }, []);

    const clearCompleted = useCallback(() => {
        setActiveUploads(prev => prev.filter(u => u.status === 'uploading'));
    }, []);

    const toggleWidget = useCallback(() => setIsWidgetOpen(prev => !prev), []);

    const hasActiveUploads = activeUploads.some(u => u.status === 'uploading');

    return (
        <UploadContext.Provider value={{
            activeUploads,
            isWidgetOpen,
            hasActiveUploads,
            startUpload,
            removeUpload,
            clearCompleted,
            toggleWidget,
            setIsWidgetOpen,
        }}>
            {children}
        </UploadContext.Provider>
    );
};

export const useUpload = () => useContext(UploadContext);
