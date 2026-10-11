import { useEffect, useState } from "react";
import api from "../../services/api";
import { useUpload } from "../../context/UploadContext";
import { Plus, MoreVertical, Trash2, Pencil, Link as LinkIcon, FileText, X, Loader2 } from "lucide-react";
import { useConfirm } from "../../components/common/ConfirmDialog";
import notify from "../../services/notification";
import AccessTargetSelect, { accessLabel } from "../../components/common/AccessTargetSelect";
import logger from '../../services/logger';

export default function LibraryManager() {
    const confirm = useConfirm();
    const [materials, setMaterials] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [type, setType] = useState('file');
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [access, setAccess] = useState({ access_type: 'all', batch_id: '', course_id: '', class_name: '' });
    const { startUpload } = useUpload();
    const [submitting, setSubmitting] = useState(false);

    const fetchMaterials = async () => {
        try {
            const res = await api.get('/public/materials');
            setMaterials(res.data);
        } catch (err) { logger.error(err); }
    };

    useEffect(() => {
        fetchMaterials();
        api.get('/admin/batches').then(res => setBatches(res.data || [])).catch(() => {});
        api.get('/admin/courses').then(res => setCourses(res.data || [])).catch(() => {});
        const onDocClick = (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);

    const openCreateModal = () => {
        setEditing(null);
        setTitle('');
        setFile(null);
        setUrl('');
        setType('file');
        setAccess({ access_type: 'all', batch_id: '', course_id: '', class_name: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditing(item);
        setTitle(item.title || '');
        setFile(null);
        setUrl(item.url || '');
        setType(item.type || 'file');
        setAccess({
            access_type: item.access_type || 'all',
            batch_id: item.batch_id ? String(item.batch_id) : '',
            course_id: item.course_id ? String(item.course_id) : '',
            class_name: item.class_name || '',
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditing(null);
        setTitle('');
        setFile(null);
        setUrl('');
        setType('file');
        setAccess({ access_type: 'all', batch_id: '', course_id: '', class_name: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {

        // গ্লোবাল আপলোড কনটেক্সটে আপলোড শুরু করো — ব্যাকগ্রাউন্ডে চলবে, পেজ চেঞ্জ করলেও থাকবে
        startUpload({
            title,
            type,
            file,
            url,
            access,
            materialId: editing ? editing.id : null,
            onSuccess: () => {
                // সফল হলে লিস্ট রিফ্রেশ
                fetchMaterials();
            }
        });

        // মডাল বন্ধ করে ফর্ম রিসেট করো — আপলোড ব্যাকগ্রাউন্ডে চলতে থাকবে
        setIsModalOpen(false);
        resetForm();
        } finally { setSubmitting(false); }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ title: "Delete Material?", message: "Delete?", confirmText: "Delete", variant: "destructive" }); if (ok) {
            try {
                await api.delete(`/admin/materials/${id}`);
                notify.success("Material deleted");
                fetchMaterials();
            } catch (err) {
                notify.error(err.response?.data?.message || "Failed to delete material");
            }
        }
    };

    const formatSize = (bytes) => {
        if (!file) return '';
        if (file.size < 1024) return file.size + ' B';
        if (file.size < 1048576) return (file.size / 1024).toFixed(1) + ' KB';
        return (file.size / 1048576).toFixed(1) + ' MB';
    };

    return (
        <div className="space-y-6">
            <div className="section-header">
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-[#1F4E79]">Library</h1>
                <p className="text-xs md:text-sm text-gray-500">Study materials & links</p>
              </div>
              <button onClick={openCreateModal} className="bg-[#1F4E79] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 w-full sm:w-auto hover:bg-[#163859]"><Plus size={16} /> Add Material</button>
            </div>

            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                        <tr>
                            <th className="p-4">Title</th>
                            <th className="p-4 hidden md:table-cell">Type</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {materials.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition">
                                <td className="p-4 flex items-center gap-3">
                                    <div className={`p-2 rounded ${item.type === 'link' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {item.type === 'link' ? <LinkIcon size={18} /> : <FileText size={18} />}
                                    </div>
                                    <span className="font-bold text-gray-800 text-sm">{item.title}</span>
                                    {item.access_type && item.access_type !== 'all' && (
                                        <span className="ml-2 text-[10px] font-bold bg-[#1F4E79]/10 text-[#1F4E79] px-2 py-0.5 rounded-full whitespace-nowrap">
                                            {accessLabel(item)}
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 hidden md:table-cell">
                                    <span className="text-xs text-gray-500 uppercase font-medium">{item.type}</span>
                                </td>
                                <td className="p-4 text-right relative">
                                    <button className="action-menu-btn p-1.5 hover:bg-gray-200 rounded-full text-gray-500" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}>
                                        <MoreVertical size={16} />
                                    </button>
                                    {openMenuId === item.id && (
                                        <div className="absolute right-8 top-2 w-32 bg-white border border-gray-200 shadow-lg rounded z-10">
                                            <button onClick={() => { setOpenMenuId(null); openEditModal(item); }} className="w-full px-4 py-2 text-xs text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                <Pencil size={14} /> Edit
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="w-full px-4 py-2 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
              {materials.map(item => (
                <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded flex-shrink-0 ${item.type === 'link' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                      {item.type === 'link' ? <LinkIcon size={18} /> : <FileText size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500 uppercase mt-0.5">{item.type}</p>
                      {item.access_type && item.access_type !== 'all' && (
                        <span className="inline-block mt-1 text-[10px] font-bold bg-[#1F4E79]/10 text-[#1F4E79] px-2 py-0.5 rounded-full">
                          {accessLabel(item)}
                        </span>
                      )}
                    </div>
                    <button onClick={() => openEditModal(item)} className="text-[#1F4E79] hover:text-[#163859] p-1 flex-shrink-0" title="Edit"><Pencil size={16}/></button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0" title="Delete"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Upload Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 responsive-modal">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 bg-[#1F4E79] text-white">
                            <h3 className="font-bold text-lg">{editing ? 'Edit Material' : 'Add Material'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition" title="Close">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-lg">
                                <button onClick={() => setType('file')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${type === 'file' ? 'bg-white shadow text-[#1F4E79]' : 'text-gray-500'}`}>File Upload</button>
                                <button onClick={() => setType('link')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${type === 'link' ? 'bg-white shadow text-[#1F4E79]' : 'text-gray-500'}`}>External Link</button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <input
                                    className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] outline-none"
                                    placeholder="Material Title" required
                                    value={title} onChange={e => setTitle(e.target.value)}
                                />

                                {type === 'file' ? (
                                    <div className={`border-2 border-dashed rounded-lg p-4 bg-gray-50 text-center transition-colors ${file ? 'border-[#1F4E79] bg-blue-50' : 'border-gray-300 hover:border-[#1F4E79]'}`}>
                                        <FileText size={28} className="mx-auto mb-2 text-gray-400" />
                                        <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#1F4E79] file:text-white file:text-xs file:font-bold file:cursor-pointer" />
                                        {file ? (
                                            <p className="text-xs text-gray-500 mt-2">
                                                {file.name} ({formatSize(file)})
                                            </p>
                                        ) : editing ? (
                                            <p className="text-xs text-gray-500 mt-2">
                                                Keeping current file. Choose a new one to replace it.
                                            </p>
                                        ) : null}
                                    </div>
                                ) : (
                                    <input
                                        className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] outline-none"
                                        placeholder="https://example.com/resource" type="url" required
                                        value={url} onChange={e => setUrl(e.target.value)}
                                    />
                                )}

                                <AccessTargetSelect
                                    value={access}
                                    batches={batches}
                                    courses={courses}
                                    onChange={setAccess}
                                />

                                <div className="flex justify-end gap-2 pt-2">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm rounded-lg font-bold bg-[#1F4E79] text-white hover:bg-[#163859] transition disabled:opacity-60 disabled:cursor-not-allowed">
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : null} {submitting ? "Saving..." : (editing ? 'Save Changes' : 'Start Upload')}
                                    </button>
                                </div>

                                <p className="text-xs text-gray-400 text-center pt-1">
                                    {editing ? 'Changes will be saved in background even if you navigate away.' : 'Upload will continue in background even if you navigate away.'}
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
