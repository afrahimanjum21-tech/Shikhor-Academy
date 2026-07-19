import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { FileText, Upload, Trash2, Download, Eye, Plus, X, File, Image, FileSpreadsheet } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';
 
export default function StudentDocumentsTab() {
    const confirm = useConfirm();
    const { id } = useParams();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadForm, setUploadForm] = useState({ name: "", type: "document" });
    const [uploadFile, setUploadFile] = useState(null);

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await api.get(`/admin/student/${id}/documents`);
            setDocuments(res.data);
        } catch (err) {
            logger.error("Failed to load documents", err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile || !uploadForm.name) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("name", uploadForm.name);
            fd.append("type", uploadForm.type);
            fd.append("file", uploadFile);
            await api.post(`/admin/student/${id}/documents`, fd);
            setShowUpload(false);
            setUploadForm({ name: "", type: "document" });
            setUploadFile(null);
            fetchDocuments();
        } catch (err) {
            const data = err.response?.data;
            notify.error(data?.message || data?.error || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (docId, name) => {
        const ok = await confirm({ title: "Delete Document?", message: `Delete "${name}"?`, confirmText: "Delete", variant: "destructive" }); if (!ok) return;
        try {
            await api.delete(`/admin/student/${id}/documents/${docId}`);
            fetchDocuments();
        } catch (err) {
            notify.error("Failed to delete");
        }
    };

    const getFileIcon = (type) => {
        if (type === "image" || type === "photo") return Image;
        if (type === "spreadsheet") return FileSpreadsheet;
        return FileText;
    };

    const getFileUrl = (path) => buildAssetUrl(path);

    if (loading) return <div className="p-10 text-center text-gray-400">Loading documents...</div>;

    return (
        <div className="space-y-6">
            {/* Page title */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-6 md:px-7 py-4">
                <div>
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Student Documents</h2>
                    <p className="text-xs md:text-sm text-gray-400 mt-0.5">{documents.length} document{documents.length !== 1 ? 's' : ''} on file</p>
                </div>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border ${
                        showUpload
                            ? 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                            : 'bg-[#1F4E79] text-white border-[#1F4E79] hover:bg-[#163859] shadow-sm'
                    }`}
                >
                    {showUpload ? <X size={16} /> : <Upload size={16} />}
                    {showUpload ? "Cancel" : "Upload Document"}
                </button>
            </div>

            {/* Upload Form */}
            {showUpload && (
                <form onSubmit={handleUpload} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-7 space-y-4 transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Document Name</label>
                            <input
                                required
                                value={uploadForm.name}
                                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                                className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79]/20 transition"
                                placeholder="e.g. Student ID Card"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Type</label>
                            <select
                                value={uploadForm.type}
                                onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                                className="w-full border border-gray-200 p-2.5 rounded-xl text-sm bg-white outline-none focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79]/20 transition"
                            >
                                <option value="document">Document</option>
                                <option value="identity">Identity</option>
                                <option value="form">Form</option>
                                <option value="academic">Academic</option>
                                <option value="image">Image</option>
                                <option value="certificate">Certificate</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">File</label>
                            <input
                                required
                                type="file"
                                onChange={(e) => setUploadFile(e.target.files[0])}
                                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-[#1F4E79] file:text-white file:text-xs file:font-bold hover:file:bg-[#163859] transition file:cursor-pointer"
                            />
                        </div>
                    </div>
                    {uploadFile && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                            <Check size={12} /> Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                        </p>
                    )}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={uploading}
                            className="px-5 py-2.5 bg-[#1F4E79] text-white rounded-xl text-sm font-bold disabled:opacity-60 hover:bg-[#163859] transition shadow-sm"
                        >
                            {uploading ? "Uploading..." : "Upload"}
                        </button>
                    </div>
                </form>
            )}

            {/* Document Grid */}
            {documents.length === 0 ? (
                <div className="text-center py-14 bg-white rounded-2xl border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                    <FileText size={48} className="mx-auto text-gray-300 mb-3 opacity-50" />
                    <p className="text-sm text-gray-400 font-medium">No documents uploaded yet</p>
                    <button
                        onClick={() => setShowUpload(true)}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1F4E79] hover:underline"
                    >
                        <Plus size={14} /> Upload first document
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {documents.map((doc) => {
                        const Icon = getFileIcon(doc.type);
                        return (
                            <div key={doc.id} className="group bg-white rounded-2xl border border-gray-100 p-4 md:p-5 transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#F0F4F8] flex items-center justify-center shrink-0">
                                        <Icon size={18} className="text-[#1F4E79]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{doc.name}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5 font-medium capitalize">{doc.type}</p>
                                        {doc.original_name && (
                                            <p className="text-[10px] text-gray-300 mt-0.5 truncate">{doc.original_name}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <a
                                            href={getFileUrl(doc.file_path)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                            title="View"
                                        >
                                            <Eye size={14} />
                                        </a>
                                        <a
                                            href={getFileUrl(doc.file_path)}
                                            download
                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                            title="Download"
                                        >
                                            <Download size={14} />
                                        </a>
                                        <button
                                            onClick={() => handleDelete(doc.id, doc.name)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Check({ size, className }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
