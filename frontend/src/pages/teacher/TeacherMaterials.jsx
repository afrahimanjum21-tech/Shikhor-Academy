import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { Upload, FileText, Trash2, Edit, Download, BookOpen } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';

export default function TeacherMaterials() {
    const confirm = useConfirm();
    const [materials, setMaterials] = useState([]);
    const [showUpload, setShowUpload] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', batch_id: '', subject: '', file: null });
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchMaterials();
        fetchBatches();
    }, []);

    const fetchMaterials = async () => {
        try {
            const { data } = await api.get('/teacher/materials');
            setMaterials(data);
        } catch (error) {
            logger.error('Failed to fetch materials:', error);
        }
    };

    const fetchBatches = async () => {
        try {
            const { data } = await api.get('/teacher/batches');
            setBatches(data);
        } catch (error) {
            logger.error('Failed to fetch batches:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('batch_id', formData.batch_id);
        data.append('subject', formData.subject);
        if (formData.file) {
            data.append('file', formData.file);
        }

        try {
            if (editingMaterial) {
                await api.put(`/teacher/materials/${editingMaterial.id}`, data);
            } else {
                await api.post('/teacher/materials', data);
            }
            await fetchMaterials();
            setShowUpload(false);
            setEditingMaterial(null);
            setFormData({ title: '', description: '', batch_id: '', subject: '', file: null });
        } catch (error) {
            logger.error('Failed to save material:', error);
            notify.error('Failed to save material');
        }
    };

    const handleEdit = (material) => {
        setEditingMaterial(material);
        setFormData({
            title: material.title,
            description: material.description,
            batch_id: material.batch_id,
            subject: material.subject,
            file: null
        });
        setShowUpload(true);
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ title: "Delete Material?", message: "Are you sure you want to delete this material?", confirmText: "Delete", variant: "destructive" }); if (ok) {
            try {
                await api.delete(`/teacher/materials/${id}`);
                await fetchMaterials();
            } catch (error) {
                logger.error('Failed to delete material:', error);
                notify.error('Failed to delete material');
            }
        }
    };

    const handleDownload = (filePath) => {
        const url = buildAssetUrl(filePath);
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Study Materials</h1>
                <button
                    onClick={() => { setShowUpload(true); setEditingMaterial(null); setFormData({ title: '', description: '', batch_id: '', subject: '', file: null }); }}
                    className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors flex items-center gap-2"
                >
                    <Upload size={16} /> Upload Material
                </button>
            </div>

            {/* Upload Modal */}
            {showUpload && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">
                        {editingMaterial ? 'Edit Material' : 'Upload New Material'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                            <select
                                value={formData.batch_id}
                                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                            >
                                <option value="">Select a batch</option>
                                 {batches.map((assignment) => (
                                     <option key={assignment.id} value={assignment.batch_id}>
                                         {assignment.name} - {assignment.subject}
                                     </option>
                                 ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                            <input
                                type="file"
                                onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                                required={!editingMaterial}
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors">
                                {editingMaterial ? 'Update' : 'Upload'}
                            </button>
                            <button type="button" onClick={() => { setShowUpload(false); setEditingMaterial(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Materials List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materials.map((material) => (
                    <div key={material.id} className="bg-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-[#1F4E79]/10 rounded-lg">
                                <FileText className="text-[#1F4E79]" size={24} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(material)} className="p-1 text-gray-500 hover:text-[#1F4E79] transition-colors">
                                    <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(material.id)} className="p-1 text-gray-500 hover:text-red-600 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <h3 className="font-bold text-gray-800 mb-2">{material.title}</h3>
                        <p className="text-sm text-gray-600 mb-4">{material.description}</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <BookOpen size={16} />
                                <span>{material.subject}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>Batch: {material.Batch?.name}</span>
                            </div>
                                {material.Uploader && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 pt-1 border-t border-gray-100">
                                        <span>Uploaded by <strong>{material.Uploader?.name}</strong></span>
                                    </div>
                                )}
                        </div>
                        <button
                            onClick={() => handleDownload(material.file_path)}
                            className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <Download size={16} /> Download
                        </button>
                    </div>
                ))}
            </div>

            {materials.length === 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
                    <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-500">No materials uploaded yet</p>
                </div>
            )}
        </div>
    );
}
