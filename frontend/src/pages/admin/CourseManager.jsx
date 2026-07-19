import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { Plus, Edit, Trash2, Search, BookOpen, Star, Eye, EyeOff, Check, X, Layers } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';

const emptyCourseForm = {
    title: '', category_id: '', fee: '', discount_price: '',
    description: '', features: '', duration: '', seats: '',
    teacher_name: '', class_mode: '', is_featured: false, is_active: true,
};

const emptyCategoryForm = { name: '', icon: '', color: '#1F4E79', is_active: true, is_visible: true };

export default function CourseManager() {
    const [activeTab, setActiveTab] = useState('courses');

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-gray-200 pb-0">
                <button
                    onClick={() => setActiveTab('courses')}
                    className={`pb-3 px-1 text-sm font-bold transition-colors relative ${
                        activeTab === 'courses'
                            ? 'text-[#1F4E79]'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Courses
                    {activeTab === 'courses' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1F4E79] rounded-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`pb-3 px-1 text-sm font-bold transition-colors relative ${
                        activeTab === 'categories'
                            ? 'text-[#1F4E79]'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Categories
                    {activeTab === 'categories' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1F4E79] rounded-full" />
                    )}
                </button>
            </div>

            {activeTab === 'courses' ? <CoursesSection /> : <CategoriesSection />}
        </div>
    );
}

function CoursesSection() {
    const confirm = useConfirm();
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [saving, setSaving] = useState(false);
    const [thumbnail, setThumbnail] = useState(null);
    const [formData, setFormData] = useState(emptyCourseForm);

    const fetchCourses = async () => {
        try {
            const { data } = await api.get('/admin/courses');
            setCourses(data.data || data);
        } catch (err) { logger.error(err); }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await api.get('/admin/course-categories');
            setCategories(data.data || data);
        } catch (err) { logger.error(err); }
    };

    useEffect(() => {
        Promise.all([fetchCourses(), fetchCategories()]).finally(() => setLoading(false));
    }, []);

    const resetForm = () => { setFormData(emptyCourseForm); setThumbnail(null); setEditingId(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                const value = formData[key];
                if ((key === 'features' || key === 'description') && value) data.append(key, value);
                else if (value !== null && value !== undefined && value !== '') data.append(key, value);
            });
            if (thumbnail) data.append('thumbnail', thumbnail);

            if (editingId) {
                data.append('_method', 'PUT');
                await api.post(`/admin/courses/${editingId}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                notify.success("Updated Successfully!");
            } else {
                await api.post('/admin/courses', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                notify.success("Created Successfully!");
            }
            setShowModal(false);
            resetForm();
            fetchCourses();
        } catch (error) {
            notify.error(error.response?.data?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async (course) => {
        try {
            const { data } = await api.get(`/admin/courses/${course.id}`);
            setFormData({
                title: data.title || '',
                category_id: data.category_id || '',
                fee: data.fee || '',
                discount_price: data.discount_price || '',
                description: data.description || '',
                features: Array.isArray(data.features) ? data.features.join('\n') : (data.features || ''),
                duration: data.duration || '',
                seats: data.seats || '',
                teacher_name: data.teacher_name || '',
                class_mode: data.class_mode || '',
                is_featured: data.is_featured ?? false,
                is_active: data.is_active ?? true,
            });
            setThumbnail(null);
            setEditingId(data.id);
            setShowModal(true);
        } catch (error) {
            logger.error('Failed to fetch course:', error);
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ title: "Delete Course?", message: "Are you sure? This will delete all batches and exams related to this course.", confirmText: "Delete", variant: "destructive" }); if (ok) {
            try {
                await api.delete(`/admin/courses/${id}`);
                notify.success("Course Deleted Successfully");
                fetchCourses();
            } catch (error) {
                notify.error("Failed: " + (error.response?.data?.message || error.message));
            }
        }
    };

    const handleToggleActive = async (id) => {
        try { await api.post(`/admin/courses/${id}/toggle-active`); fetchCourses(); }
        catch (error) { logger.error('Failed to toggle active:', error); }
    };

    const handleToggleFeatured = async (id) => {
        try { await api.post(`/admin/courses/${id}/toggle-featured`); fetchCourses(); }
        catch (error) { logger.error('Failed to toggle featured:', error); }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
    }

    const filteredCourses = courses.filter(c =>
        c.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="section-header">
                <div>
                    <h1 className="text-lg md:text-2xl font-bold text-gray-800">Courses</h1>
                    <p className="text-xs md:text-sm text-gray-500">Manage academic programs</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <input type="text" placeholder="Search..." className="w-full pl-8 pr-4 py-2 border rounded-lg focus:outline-none focus:border-[#1F4E79] text-sm" onChange={e => setSearchTerm(e.target.value)} />
                        <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                    </div>
                    <button onClick={() => { resetForm(); setShowModal(true); }} className="bg-[#1F4E79] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#163859] transition-colors w-full sm:w-auto">
                        <Plus size={16} /> Add Course
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-4">Course</th>
                                <th className="p-4 hidden md:table-cell">Category</th>
                                <th className="p-4 hidden lg:table-cell">Teacher</th>
                                <th className="p-4">Fee</th>
                                <th className="p-4 text-center">Featured</th>
                                <th className="p-4 text-center">Active</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCourses.map(course => (
                                <tr key={course.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {course.thumbnail ? (
                                                <img src={buildAssetUrl(course.thumbnail)} alt={course.title} className="h-10 w-10 rounded-lg object-cover border border-gray-200" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-lg bg-[#1F4E79]/10 flex items-center justify-center">
                                                    <BookOpen size={18} className="text-[#1F4E79]" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-gray-800">{course.title}</p>
                                                {course.duration && <p className="text-xs text-gray-500">{course.duration}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 hidden md:table-cell">
                                        {course.course_category ? (
                                            <span className="px-2 py-1 rounded text-xs font-bold"
                                                style={{
                                                    backgroundColor: course.course_category.color
                                                        ? `${course.course_category.color}15` : '#1F4E7915',
                                                    color: course.course_category.color || '#1F4E79',
                                                }}>
                                                {course.course_category.name}
                                            </span>
                                        ) : course.category ? (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold uppercase">
                                                {course.category}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="p-4 hidden lg:table-cell text-sm text-gray-600">
                                        {course.teacher_name || '—'}
                                    </td>
                                    <td className="p-4 font-bold text-[#1F4E79]">
                                        ৳{course.fee}
                                        {course.discount_price && (
                                            <span className="ml-1 text-xs text-gray-400 line-through">৳{course.discount_price}</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleToggleFeatured(course.id)}
                                            className={`p-1 rounded ${course.is_featured ? 'text-yellow-500' : 'text-gray-300'}`}>
                                            <Star size={18} fill={course.is_featured ? 'currentColor' : 'none'} />
                                        </button>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleToggleActive(course.id)}
                                            className={`p-1 rounded ${course.is_active ? 'text-green-500' : 'text-gray-300'}`}>
                                            {course.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => handleEdit(course)}
                                                className="p-1.5 text-gray-500 hover:text-[#1F4E79] hover:bg-gray-100 rounded transition-colors" title="Edit">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(course.id)}
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                    {filteredCourses.map(course => (
                        <div key={course.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                            <div className="flex items-start gap-3">
                                {course.thumbnail ? (
                                    <img src={buildAssetUrl(course.thumbnail)} alt={course.title} className="h-10 w-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                                ) : (
                                    <div className="h-10 w-10 rounded-lg bg-[#1F4E79]/10 flex items-center justify-center flex-shrink-0"><BookOpen size={18} className="text-[#1F4E79]" /></div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-800 text-sm truncate">{course.title}</p>
                                    {course.duration && <p className="text-xs text-gray-500">{course.duration}</p>}
                                    <p className="text-sm font-bold text-[#1F4E79] mt-1">৳{course.fee}{course.discount_price && <span className="ml-1 text-xs text-gray-400 line-through">৳{course.discount_price}</span>}</p>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => handleToggleFeatured(course.id)} className={`p-1.5 rounded ${course.is_featured ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300'}`}><Star size={15} fill={course.is_featured ? 'currentColor' : 'none'} /></button>
                                    <button onClick={() => handleEdit(course)} className="p-1.5 text-gray-500 hover:text-[#1F4E79] hover:bg-gray-100 rounded"><Edit size={15} /></button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                                {course.course_category ? (
                                    <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: course.course_category.color ? `${course.course_category.color}15` : '#1F4E7915', color: course.course_category.color || '#1F4E79' }}>{course.course_category.name}</span>
                                ) : null}
                                <span className="text-xs text-gray-500">{course.teacher_name ? `by ${course.teacher_name}` : ''}</span>
                                <div className="flex-1" />
                                <button onClick={() => handleDelete(course.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                    {filteredCourses.length === 0 && (
                        <div className="p-8 text-center text-gray-500"><BookOpen size={36} className="mx-auto mb-3 text-gray-300" /><p>No courses found</p></div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 responsive-modal">
                    <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex items-center justify-between">
                            <h2 className="text-base md:text-xl font-bold text-gray-800">{editingId ? 'Edit Course' : 'Add Course'}</h2>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Title *</label>
                                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent">
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Name</label>
                                    <input type="text" value={formData.teacher_name} onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                                        placeholder="e.g. Prof. John Doe" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee *</label>
                                    <input type="number" value={formData.fee} onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                                        required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Price</label>
                                    <input type="number" value={formData.discount_price} onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                                    <input type="text" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                        placeholder="e.g. 12 Months" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
                                    <input type="number" value={formData.seats} onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Mode</label>
                                    <input type="text" value={formData.class_mode} onChange={(e) => setFormData({ ...formData, class_mode: e.target.value })}
                                        placeholder="Offline / Online / Hybrid" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail</label>
                                    <input type="file" accept="image/jpg,image/jpeg,image/png,image/webp"
                                        onChange={(e) => setThumbnail(e.target.files[0])}
                                        className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#1F4E79] file:text-white hover:file:bg-[#1a3d66]" />
                                    {thumbnail && <p className="text-xs text-green-600 mt-1">Selected: {thumbnail.name}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Features (one per line)</label>
                                <textarea value={formData.features} onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                                    rows={4} placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                                <p className="text-xs text-gray-400 mt-1">Each line becomes a feature item</p>
                            </div>

                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.is_featured}
                                        onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                                        className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]" />
                                    <span className="text-sm text-gray-700">Featured</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]" />
                                    <span className="text-sm text-gray-700">Active</span>
                                </label>
                            </div>

                            <div className="flex gap-2 justify-end pt-2 border-t border-gray-200">
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="px-6 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors disabled:opacity-50">
                                    {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function CategoriesSection() {
    const confirm = useConfirm();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState(emptyCategoryForm);

    const fetchCategories = async () => {
        try {
            const { data } = await api.get('/admin/course-categories');
            setCategories(data.data || data);
        } catch (error) {
            logger.error('Failed to fetch categories:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    const openAdd = () => {
        setEditing(null);
        setFormData(emptyCategoryForm);
        setShowModal(true);
    };

    const openEdit = (cat) => {
        setEditing(cat);
        setFormData({
            name: cat.name || '',
            icon: cat.icon || '',
            color: cat.color || '#1F4E79',
            is_active: cat.is_active ?? true,
            is_visible: cat.is_visible ?? true,
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/admin/course-categories/${editing.id}`, formData);
            } else {
                await api.post('/admin/course-categories', formData);
            }
            setShowModal(false);
            setEditing(null);
            fetchCategories();
        } catch (error) {
            notify.error(error.response?.data?.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ title: "Delete Category?", message: "Are you sure you want to delete this category?", confirmText: "Delete", variant: "destructive" }); if (ok) {
            try {
                await api.delete(`/admin/course-categories/${id}`);
                fetchCategories();
            } catch (error) {
                notify.error(error.response?.data?.message || 'Failed to delete category');
            }
        }
    };

    const handleToggleActive = async (id) => {
        try { await api.post(`/admin/course-categories/${id}/toggle-active`); fetchCategories(); }
        catch (error) { logger.error('Failed to toggle active:', error); }
    };

    const handleToggleVisibility = async (id) => {
        try { await api.post(`/admin/course-categories/${id}/toggle-visible`); fetchCategories(); }
        catch (error) { logger.error('Failed to toggle visibility:', error); }
    };

    const handleMoveUp = async (index) => {
        if (index === 0) return;
        const items = [...categories];
        const temp = items[index].display_order;
        items[index].display_order = items[index - 1].display_order;
        items[index - 1].display_order = temp;
        try {
            await api.post('/admin/course-categories/reorder', {
                categories: items.map((c, i) => ({ id: c.id, display_order: i * 10 }))
            });
            fetchCategories();
        } catch (error) {
            logger.error('Failed to reorder:', error);
        }
    };

    const handleMoveDown = async (index) => {
        if (index === categories.length - 1) return;
        const items = [...categories];
        const temp = items[index].display_order;
        items[index].display_order = items[index + 1].display_order;
        items[index + 1].display_order = temp;
        try {
            await api.post('/admin/course-categories/reorder', {
                categories: items.map((c, i) => ({ id: c.id, display_order: i * 10 }))
            });
            fetchCategories();
        } catch (error) {
            logger.error('Failed to reorder:', error);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="section-header">
                <div>
                    <h1 className="text-lg md:text-2xl font-bold text-gray-800">Course Categories</h1>
                    <p className="text-xs md:text-sm text-gray-500">Manage categories shown on the public courses page</p>
                </div>
                <button onClick={openAdd}
                    className="bg-[#1F4E79] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1a3d66] transition-colors w-full sm:w-auto">
                    <Plus size={16} /> Add Category
                </button>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="hidden md:block">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700 w-20">Order</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Name</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Icon</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Color</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Active</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Visible</th>
                                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat, index) => (
                                <tr key={cat.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col">
                                                <button onClick={() => handleMoveUp(index)} disabled={index === 0}
                                                    className={`text-[10px] leading-none p-0.5 ${index === 0 ? 'text-gray-200' : 'text-gray-500 hover:text-[#1F4E79]'}`}>▲</button>
                                                <button onClick={() => handleMoveDown(index)} disabled={index === categories.length - 1}
                                                    className={`text-[10px] leading-none p-0.5 ${index === categories.length - 1 ? 'text-gray-200' : 'text-gray-500 hover:text-[#1F4E79]'}`}>▼</button>
                                            </div>
                                            <span className="text-xs text-gray-400">{cat.display_order ?? index + 1}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{cat.icon || '—'}</td>
                                    <td className="px-4 py-3">
                                        {cat.color ? (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-block w-5 h-5 rounded border border-gray-200" style={{ backgroundColor: cat.color }} />
                                                <span className="text-xs text-gray-500">{cat.color}</span>
                                            </div>
                                        ) : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => handleToggleActive(cat.id)}
                                            className={`p-1 rounded ${cat.is_active ? 'text-green-500' : 'text-gray-300'}`}>
                                            {cat.is_active ? <Check size={18} /> : <X size={18} />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => handleToggleVisibility(cat.id)}
                                            className={`p-1 rounded ${cat.is_visible ? 'text-blue-500' : 'text-gray-300'}`}>
                                            {cat.is_visible ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => openEdit(cat)}
                                                className="p-1 text-gray-500 hover:text-[#1F4E79] transition-colors" title="Edit">
                                                <Edit size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(cat.id)}
                                                className="p-1 text-gray-500 hover:text-red-600 transition-colors" title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {categories.length === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            <Layers size={48} className="mx-auto mb-4 text-gray-300" />
                            <p>No categories found</p>
                        </div>
                    )}
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2 p-2">
                    {categories.map((cat, index) => (
                        <div key={cat.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {cat.color ? (
                                        <span className="inline-block w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: cat.color }} />
                                    ) : null}
                                    <span className="font-bold text-gray-800 text-sm">{cat.name}</span>
                                    {cat.icon && <span className="text-xs text-gray-500">({cat.icon})</span>}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(cat)}
                                        className="p-1 text-gray-500 hover:text-[#1F4E79] transition-colors" title="Edit">
                                        <Edit size={15} />
                                    </button>
                                    <button onClick={() => handleDelete(cat.id)}
                                        className="p-1 text-gray-500 hover:text-red-600 transition-colors" title="Delete">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                                <span className="text-gray-400">#{cat.display_order ?? index + 1}</span>
                                <span className="text-gray-300">|</span>
                                <button onClick={() => handleToggleActive(cat.id)}
                                    className={`flex items-center gap-1 ${cat.is_active ? 'text-green-500' : 'text-gray-300'}`}>
                                    {cat.is_active ? <Check size={14} /> : <X size={14} />}
                                    <span>Active</span>
                                </button>
                                <button onClick={() => handleToggleVisibility(cat.id)}
                                    className={`flex items-center gap-1 ${cat.is_visible ? 'text-blue-500' : 'text-gray-300'}`}>
                                    {cat.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                    <span>Visible</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <Layers size={36} className="mx-auto mb-3 text-gray-300" />
                            <p>No categories found</p>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 responsive-modal">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex items-center justify-between">
                            <h2 className="text-base md:text-xl font-bold text-gray-800">{editing ? 'Edit Category' : 'Add Category'}</h2>
                            <button onClick={() => { setShowModal(false); setEditing(null); }} className="text-gray-500 hover:text-gray-700">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                                <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    placeholder="e.g. BookOpen" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                                <p className="text-xs text-gray-400 mt-1">Lucide icon name (optional)</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <div className="flex gap-2">
                                    <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="h-10 w-12 border border-gray-300 rounded-lg cursor-pointer" />
                                    <input type="text" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        placeholder="#1F4E79" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]" />
                                    <span className="text-sm text-gray-700">Active</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={formData.is_visible}
                                        onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                                        className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]" />
                                    <span className="text-sm text-gray-700">Visible on website</span>
                                </label>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button type="button" onClick={() => { setShowModal(false); setEditing(null); }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors disabled:opacity-50">
                                    {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
