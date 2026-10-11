import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { Plus, MoreVertical, Edit, Trash2, Trophy, Search, Save, ImagePlus, X, Loader2 } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';

export default function SuccessStoryManager() {
    const confirm = useConfirm();
    const [stories, setStories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [photoPreview, setPhotoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const emptyForm = { student_name: '', achievement: '', batch_info: '', story: '', message: '', display_order: '', is_active: true, photo: null, remove_photo: false };
    const [formData, setFormData] = useState(emptyForm);

    const fetchStories = async () => {
        try {
            const res = await api.get('/admin/success-stories');
            setStories(Array.isArray(res.data) ? res.data : []);
        } catch (err) { logger.error(err); }
    };

    useEffect(() => {
        fetchStories();
        const onDocClick = (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        const payload = new FormData();
        payload.append('student_name', formData.student_name);
        payload.append('achievement', formData.achievement || '');
        payload.append('batch_info', formData.batch_info || '');
        payload.append('story', formData.story || '');
        payload.append('message', formData.message || '');
        payload.append('display_order', formData.display_order || 0);
        payload.append('is_active', formData.is_active ? '1' : '0');
        if (formData.photo) payload.append('photo', formData.photo);
        if (formData.remove_photo) payload.append('remove_photo', '1');
        try {
            if (editingId) {
                await api.put(`/admin/success-stories/${editingId}`, payload);
                notify.success("Story Updated!");
            } else {
                await api.post('/admin/success-stories', payload);
                notify.success("Story Added!");
            }
            setIsModalOpen(false);
            setFormData(emptyForm);
            setPhotoPreview(null);
            setEditingId(null);
            fetchStories();
        } catch (error) { notify.error("Failed: " + (error.response?.data?.message || error.message)); }
        finally { setSubmitting(false); }
    };

    const handleEdit = (story) => {
        setFormData({
            student_name: story.student_name,
            achievement: story.achievement || '',
            batch_info: story.batch_info || '',
            story: story.story || '',
            message: story.message || '',
            display_order: story.display_order || '',
            is_active: story.is_active,
            photo: null,
            remove_photo: false,
        });
        setPhotoPreview(story.photo ? buildAssetUrl(story.photo) : null);
        setEditingId(story.id);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ title: "Delete Success Story?", message: "This story will be removed from the website.", confirmText: "Delete", variant: "destructive" });
        if (ok) {
            try {
                await api.delete(`/admin/success-stories/${id}`);
                notify.success("Success story deleted");
                fetchStories();
            } catch (err) {
                notify.error(err.response?.data?.message || "Failed to delete success story");
            }
        }
    };

    const filtered = stories.filter(s =>
        s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.achievement || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="section-header">
                <div>
                    <h1 className="text-lg md:text-2xl font-bold text-[#1F4E79]">Success Stories</h1>
                    <p className="text-xs md:text-sm text-gray-500">Student achievements shown on the home page</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <input type="text" placeholder="Search..." className="w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:border-[#1F4E79] text-sm" onChange={e => setSearchTerm(e.target.value)} />
                        <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                    </div>
                    <button onClick={() => { setEditingId(null); setFormData(emptyForm); setPhotoPreview(null); setIsModalOpen(true); }}
                        className="bg-[#1F4E79] text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#163859] shadow w-full sm:w-auto">
                        <Plus size={16} /> Add Story
                    </button>
                </div>
            </div>

            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                        <tr>
                            <th className="p-4">Student</th>
                            <th className="p-4">Achievement</th>
                            <th className="p-4">Order</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map(story => (
                            <tr key={story.id} className="hover:bg-gray-50 transition">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            {story.photo ? <img src={buildAssetUrl(story.photo)} alt={story.student_name} className="w-full h-full object-cover" /> : <Trophy size={16} className="text-[#1F4E79]" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 text-sm">{story.student_name}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{story.batch_info || story.story}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">{story.achievement || "—"}</span>
                                </td>
                                <td className="p-4 text-sm text-gray-600">{story.display_order}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${story.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{story.is_active ? 'Active' : 'Hidden'}</span>
                                </td>
                                <td className="p-4 text-right relative">
                                    <button className="action-menu-btn p-1.5 hover:bg-gray-200 rounded-full text-gray-500" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === story.id ? null : story.id); }}>
                                        <MoreVertical size={16} />
                                    </button>
                                    {openMenuId === story.id && (
                                        <div className="absolute right-8 top-2 w-32 bg-white border border-gray-200 shadow-lg rounded z-10 overflow-hidden">
                                            <button onClick={() => handleEdit(story)} className="w-full px-4 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 text-blue-600"><Edit size={14} /> Edit</button>
                                            <button onClick={() => handleDelete(story.id)} className="w-full px-4 py-2 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2 border-t"><Trash2 size={14} /> Delete</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan="5" className="p-10 text-center text-gray-400 text-sm">No success stories yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden space-y-2">
                {filtered.map(story => (
                    <div key={story.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center flex-shrink-0">
                                {story.photo ? <img src={buildAssetUrl(story.photo)} alt={story.student_name} className="w-full h-full object-cover" /> : <Trophy size={16} className="text-[#1F4E79]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-800 text-sm">{story.student_name}</p>
                                <p className="text-xs text-green-700 font-semibold mt-0.5">{story.achievement}</p>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{story.story}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${story.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{story.is_active ? 'Active' : 'Hidden'}</span>
                                    <span className="text-[10px] text-gray-400">Order {story.display_order}</span>
                                </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => handleEdit(story)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={15} /></button>
                                <button onClick={() => handleDelete(story.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                            </div>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400 text-sm">No success stories yet</div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 responsive-modal">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-xl mb-4 text-[#1F4E79] border-b pb-2">{editingId ? 'Edit Success Story' : 'Add Success Story'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Student Name</label>
                                <input className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#1F4E79] mt-1" placeholder="e.g. Rahim Uddin" required value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Achievement</label>
                                    <input className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#1F4E79] mt-1" placeholder="e.g. GPA 5.00, HSC 2025" value={formData.achievement} onChange={e => setFormData({...formData, achievement: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Batch Info</label>
                                    <input className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#1F4E79] mt-1" placeholder="e.g. HSC Science 2024" value={formData.batch_info} onChange={e => setFormData({...formData, batch_info: e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500">Story</label>
                                <textarea rows="4" className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#1F4E79] mt-1" placeholder="Write the student's success story..." value={formData.story} onChange={e => setFormData({...formData, story: e.target.value})} />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500">Message From Student <span className="font-normal text-gray-400">(shown as the closing quote on the story page)</span></label>
                                <textarea rows="2" className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#1F4E79] mt-1" placeholder="A short inspirational message in the student's own words..." value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Display Order</label>
                                    <input type="number" className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#1F4E79] mt-1" placeholder="0" value={formData.display_order} onChange={e => setFormData({...formData, display_order: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Status</label>
                                    <select className="w-full border p-2 rounded text-sm bg-white mt-1" value={formData.is_active ? '1' : '0'} onChange={e => setFormData({...formData, is_active: e.target.value === '1'})}>
                                        <option value="1">Active (visible)</option>
                                        <option value="0">Hidden</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500">Photo <span className="font-normal text-gray-400">(optional)</span></label>
                                <div className="flex items-center gap-3 mt-1">
                                    {photoPreview && (
                                        <img src={photoPreview} alt="Preview" className="w-14 h-14 rounded-full object-cover border border-gray-200" />
                                    )}
                                    <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-3 text-xs text-gray-500 hover:border-[#1F4E79] hover:text-[#1F4E79] cursor-pointer transition">
                                        <ImagePlus size={16} /> {photoPreview ? 'Replace photo' : 'Upload photo'}
                                        <input type="file" accept="image/*" className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setFormData({...formData, photo: file, remove_photo: false});
                                                    setPhotoPreview(URL.createObjectURL(file));
                                                }
                                            }} />
                                    </label>
                                    {photoPreview && (
                                        <button type="button" onClick={() => { setPhotoPreview(null); setFormData({...formData, photo: null, remove_photo: true}); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded" aria-label="Remove photo">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={submitting} className="px-6 py-2 text-sm bg-[#1F4E79] text-white rounded-lg hover:bg-[#163859] shadow-md flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {submitting ? "Saving..." : "Save Story"}
                                    </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}