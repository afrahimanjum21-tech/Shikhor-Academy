import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { Plus, Trash2, Pencil, X, Youtube, Facebook, Image as ImageIcon, Lock, LockOpen, Eye, Users } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import AccessTargetSelect, { accessLabel } from "../../components/common/AccessTargetSelect";
import logger from '../../services/logger';
 
export default function ElearningManager() {
    const confirm = useConfirm();
    const [videos, setVideos] = useState([]);
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);     // null = add, object = edit
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);

    function emptyForm() {
        return {
            title: '', description: '', teacher: '', duration: '',
            video_url: '', is_locked: false, is_active: true,
            sort_order: 0, thumbnail: null, removeThumbnail: false,
            access_type: 'all', batch_id: '', course_id: '', class_name: '',
        };
    }

    const fetchVideos = async () => {
        try {
            const res = await api.get('/admin/e-learning');
            setVideos(res.data);
        } catch (err) {
            logger.error(err);
            notify.error("Video has failed to load");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
        api.get('/admin/batches')
            .then(res => setBatches(res.data || []))
            .catch(err => logger.error("Failed to load batches:", err));
        api.get('/admin/courses')
            .then(res => setCourses(res.data || []))
            .catch(err => logger.error("Failed to load courses:", err));
    }, []);

    const openAdd = () => {
        setEditing(null);
        setForm(emptyForm());
        setIsModalOpen(true);
    };

    const openEdit = (vid) => {
        setEditing(vid);
        setForm({
            title: vid.title || '',
            description: vid.description || '',
            teacher: vid.teacher || '',
            duration: vid.duration || '',
            video_url: vid.video_url || '',
            is_locked: !!vid.is_locked,
            is_active: vid.is_active !== false,
            sort_order: vid.sort_order || 0,
            thumbnail: null,
            removeThumbnail: false,
            access_type: vid.access_type || (vid.batch_id ? 'batch' : 'all'),
            batch_id: vid.batch_id || '',
            course_id: vid.course_id || '',
            class_name: vid.class_name || '',
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.video_url) {
            notify.warning("Title and video link are required");
            return;
        }
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('description', form.description || '');
            formData.append('teacher', form.teacher || '');
            formData.append('duration', form.duration || '');
            formData.append('video_url', form.video_url);
            formData.append('is_locked', form.is_locked ? '1' : '0');
            formData.append('is_active', form.is_active ? '1' : '0');
            formData.append('sort_order', form.sort_order || 0);
            formData.append('access_type', form.access_type || 'all');
            formData.append('batch_id', form.batch_id || '');
            formData.append('course_id', form.course_id || '');
            formData.append('class_name', form.class_name || '');
            if (form.thumbnail) formData.append('thumbnail', form.thumbnail);

            // কাস্টম thumbnail মুছে ফেলার জন্য
            if (form.removeThumbnail) formData.append('remove_thumbnail', '1');

            if (editing) {
                formData.append('_method', 'PUT');
                await api.post(`/admin/e-learning/${editing.id}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                notify.success("Video updated successfully!");
            } else {
                await api.post('/admin/e-learning', formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                notify.success("Video added successfully!");
            }
            setIsModalOpen(false);
            fetchVideos();
        } catch (err) {
            logger.error(err);
            const msg = err.response?.data?.message || err.message || "Failed to save video";
            notify.error("Error: " + JSON.stringify(msg));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ title: "Delete Video?", message: "Are you sure you want to delete this video?", confirmText: "Delete", variant: "destructive" }); if (!ok) return;
        try {
            await api.delete(`/admin/e-learning/${id}`);
            fetchVideos();
        } catch (err) {
            notify.error("Failed to delete video");
        }
    };

    // thumbnail preview এর জন্য helper (student page এর মতোই)
    const getThumb = (vid) => {
        if (vid.thumbnail_path) return buildAssetUrl(vid.thumbnail_path);
        if (vid.platform === 'youtube' && vid.video_id) {
            return `https://img.youtube.com/vi/${vid.video_id}/hqdefault.jpg`;
        }
        return `https://placehold.co/600x400/1e3a5f/ffffff?text=No+Thumbnail`;
    };

    return (
        <div>
            <div className="section-header">
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-[#1F4E79]">E-Learning Videos</h2>
                <p className="text-xs md:text-sm text-gray-500 mt-0.5">YouTube / Facebook video links</p>
              </div>
              <button onClick={openAdd} className="flex items-center justify-center gap-2 bg-[#1F4E79] hover:bg-[#1a4068] text-white px-4 py-2 rounded-lg font-medium transition w-full sm:w-auto text-sm"><Plus size={18}/> Add Video</button>
            </div>

            {/* ভিডিও লিস্ট */}
            {loading ? (
                <p className="text-center text-gray-400 py-10">loading...</p>
            ) : videos.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-400">No videos available. Click the "Add Video" button to add your first video.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map(vid => (
                        <div key={vid.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="relative aspect-video bg-gray-100">
                                <img src={getThumb(vid)} alt={vid.title} className="w-full h-full object-cover" />
                                <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${vid.platform === 'youtube' ? 'bg-red-600 text-white' : vid.platform === 'facebook' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>
                                    {vid.platform}
                                </span>
                                {vid.is_locked && (
                                    <span className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded"><Lock size={14}/></span>
                                )}
                                {vid.access_type && vid.access_type !== 'all' && (
                                    <span className="absolute bottom-2 left-2 bg-[#1F4E79]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                        <Users size={10}/> {accessLabel(vid)}
                                    </span>
                                )}
                                {!vid.is_active && (
                                    <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-bold">Inactive</span>
                                )}
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-gray-800 mb-1 line-clamp-1">{vid.title}</h4>
                                {vid.teacher && <p className="text-xs text-gray-500 mb-2">by {vid.teacher}</p>}
                                <p className="text-xs text-gray-400 line-clamp-2 mb-3 break-all">{vid.video_url}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => openEdit(vid)} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1F4E79]/10 text-[#1F4E79] hover:bg-[#1F4E79]/20 py-1.5 rounded-md text-sm font-medium transition">
                                        <Pencil size={14}/> Edit
                                    </button>
                                    <button onClick={() => handleDelete(vid.id)} className="flex items-center justify-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-md text-sm font-medium transition">
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ========== ADD/EDIT MODAL ========== */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 responsive-modal" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-[#1F4E79]">{editing ? 'Edit Video' : 'Add New Video'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={22}/></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]" required />
                            </div>

                            {/* Video URL */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL * <span className="text-gray-400 font-normal">(YouTube or Facebook)</span></label>
                                <input type="text" value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]" required />
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                    <Youtube size={12} className="text-red-600"/> YouTube  •  <Facebook size={12} className="text-blue-600"/> Facebook
                                </p>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows="2"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]" />
                            </div>

                            {/* Teacher + Duration */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                                    <input type="text" value={form.teacher} onChange={e => setForm({...form, teacher: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                                    <input type="text" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="45 mins"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]" />
                                </div>
                            </div>

                            {/* Thumbnail upload — with preview + remove */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Thumbnail <span className="text-gray-400 font-normal">(Optional- if not provided, default YouTube/Facebook thumbnail will be used)</span></label>

                                {/* বর্তমান কাস্টম thumbnail প্রিভিউ */}
                                {(form.thumbnail && (
                                    <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border border-gray-300 mb-2">
                                        <img src={URL.createObjectURL(form.thumbnail)} alt="New thumbnail preview" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setForm({...form, thumbnail: null, removeThumbnail: false})}
                                            className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition shadow" title="Remove this thumbnail">
                                            <X size={14} />
                                        </button>
                                        <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded font-medium">New</span>
                                    </div>
                                )) || (editing?.thumbnail_path && !form.removeThumbnail && (
                                    <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border border-gray-300 mb-2">
                                        <img src={buildAssetUrl(editing.thumbnail_path)} alt="Current custom thumbnail" className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setForm({...form, removeThumbnail: true})}
                                            className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition shadow flex items-center gap-1" title="Remove custom thumbnail">
                                            <Trash2 size={12} />
                                        </button>
                                        <span className="absolute bottom-1 left-1 text-[10px] bg-[#1F4E79]/90 text-white px-1.5 py-0.5 rounded font-medium">Custom (Saved)</span>
                                    </div>
                                ))}

                                {/* remove করার পর নীল নোটিশ */}
                                {form.removeThumbnail && (
                                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-2">
                                        <Eye size={16} className="text-amber-600 shrink-0" />
                                        <span>Custom thumbnail will be removed. Default YouTube/Facebook thumbnail will be used.</span>
                                        <button type="button" onClick={() => setForm({...form, removeThumbnail: false})}
                                            className="ml-auto text-xs text-amber-800 font-medium underline hover:no-underline shrink-0">Cancel</button>
                                    </div>
                                )}

                                <input type="file" accept="image/*" onChange={e => setForm({...form, thumbnail: e.target.files[0], removeThumbnail: false})}
                                    className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#1F4E79]/10 file:text-[#1F4E79] file:font-medium hover:file:bg-[#1F4E79]/20" />
                            </div>

                            {/* Sort order */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                                <input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]" />
                            </div>

                            {/* Access — who can watch this video */}
                            <AccessTargetSelect
                                value={form}
                                batches={batches}
                                courses={courses}
                                onChange={patch => setForm({ ...form, ...patch })}
                            />

                            {/* Toggles */}
                            <div className="flex gap-6 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.is_locked} onChange={e => setForm({...form, is_locked: e.target.checked})}
                                        className="w-4 h-4 accent-[#1F4E79]" />
                                    <span className="text-sm text-gray-700 flex items-center gap-1"><Lock size={14}/> Locked</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})}
                                        className="w-4 h-4 accent-[#1F4E79]" />
                                    <span className="text-sm text-gray-700 flex items-center gap-1"><LockOpen size={14}/> Active</span>
                                </label>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-3 border-t border-gray-200">
                                <button type="submit" disabled={saving}
                                    className="flex-1 bg-[#1F4E79] hover:bg-[#1a4068] disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition">
                                    {saving ? 'Saving...' : (editing ? 'Update' : 'Add Video')}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
