import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { Users, Plus, Edit, Trash2, Search, Filter, Loader2, Star, Eye, EyeOff, ArrowUpDown, Upload, X, Tag, Mail, Phone, Award, BookOpen, Calendar, User } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import PasswordInput from "../../components/common/PasswordInput";
import logger from '../../services/logger';
 
export default function FacultyManager() {
    const confirm = useConfirm();
    const [faculty, setFaculty] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [batches, setBatches] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [viewFaculty, setViewFaculty] = useState(null);
    const [editingFaculty, setEditingFaculty] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterFeatured, setFilterFeatured] = useState('');
    const [filterActive, setFilterActive] = useState('');
    const [showTrashed, setShowTrashed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [categorySaving, setCategorySaving] = useState(false);
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '', is_active: true, display_order: 0 });
    const [editingCategory, setEditingCategory] = useState(null);
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        employee_id: '',
        designation: '',
        department_id: '',
        faculty_category_id: '',
        specialization: '',
        qualification: '',
        teaching_experience: '',
        biography: '',
        research: '',
        official_email: '',
        official_phone: '',
        public_profile_enabled: true,
        is_featured: false,
        is_active: true,
        display_order: 0,
        meta_title: '',
        meta_description: '',
        subjects: [],
        qualifications: [],
        achievements: [],
        certifications: [],
        social_links: [],
        batches: [],
        create_user_account: false,
        email: '',
        password: '',
    });
    const [profilePhoto, setProfilePhoto] = useState(null);

    useEffect(() => {
        fetchFaculty();
        fetchDepartments();
        fetchSubjects();
        fetchBatches();
        fetchCategories();
    }, [searchTerm, showTrashed, filterDepartment, filterCategory, filterFeatured, filterActive]);

    const fetchFaculty = async () => {
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (filterDepartment) params.append('department_id', filterDepartment);
            if (filterCategory) params.append('faculty_category_id', filterCategory);
            if (filterFeatured !== '') params.append('is_featured', filterFeatured);
            if (filterActive !== '') params.append('is_active', filterActive);
            if (showTrashed) params.append('trashed', 'true');

            const { data } = await api.get(`/admin/faculty?${params}`);
            setFaculty(data.data || data);
        } catch (error) {
            logger.error('Failed to fetch faculty:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const { data } = await api.get('/admin/faculty/departments');
            setDepartments(data);
        } catch (error) { logger.error('Failed to fetch departments:', error); }
    };

    const fetchSubjects = async () => {
        try {
            const { data } = await api.get('/admin/faculty/subjects');
            setSubjects(data);
        } catch (error) { logger.error('Failed to fetch subjects:', error); }
    };

    const fetchBatches = async () => {
        try {
            const { data } = await api.get('/admin/faculty/batches');
            setBatches(data);
        } catch (error) { logger.error('Failed to fetch batches:', error); }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await api.get('/admin/faculty/categories');
            setCategories(data);
        } catch (error) { logger.error('Failed to fetch categories:', error); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const data = new FormData();

        // Append all scalar fields (excluding boolean fields which will be handled separately)
        const booleanFields = ['public_profile_enabled', 'is_featured', 'is_active', 'create_user_account'];
        Object.keys(formData).forEach(key => {
            const value = formData[key];
            if (booleanFields.includes(key)) {
                return; // Skip boolean fields - will be handled separately
            }
            if (key === 'subjects') {
                // subjects is array of ids
                (value || []).forEach(id => data.append('subjects', id));
            } else if (Array.isArray(value)) {
                // nested arrays (qualifications, achievements, etc.) as JSON
                data.append(key, JSON.stringify(value));
            } else if (value !== null && value !== undefined) {
                // Always append the field, even if empty string (required for validation)
                data.append(key, value);
            }
        });

        // Append boolean flags explicitly as 0/1 so they aren't skipped when false
        data.append('public_profile_enabled', formData.public_profile_enabled ? 1 : 0);
        data.append('is_featured', formData.is_featured ? 1 : 0);
        data.append('is_active', formData.is_active ? 1 : 0);
        data.append('create_user_account', formData.create_user_account ? 1 : 0);

        if (profilePhoto) data.append('profile_photo', profilePhoto);
        if (editingFaculty) data.append('_method', 'PUT');

        try {
            if (editingFaculty) {
                await api.post(`/admin/faculty/${editingFaculty.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/admin/faculty', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            // Store সফল → modal বন্ধ + form reset
            setShowModal(false);
            setEditingFaculty(null);
            resetForm();
            setProfilePhoto(null);
            notify.success(editingFaculty ? 'Faculty updated successfully!' : 'Faculty member created successfully!');
        } catch (error) {
            logger.error('Failed to save faculty:', error);
            const responseData = error.response?.data;
            const validationErrors = responseData?.errors;
            let msg;
            if (validationErrors && typeof validationErrors === 'object') {
                msg = Object.values(validationErrors).flat().join('\n');
            } else if (typeof responseData === 'string' && responseData.trim()) {
                // Non-JSON error body (e.g. HTML error page) — show a clean message
                msg = 'Failed to save faculty. Please check the fields and try again.';
            } else {
                msg = responseData?.message || error.message || 'Failed to save faculty';
            }
            notify.error(msg);
        } finally {
            setSaving(false);
            // পেজ লিস্ট সবসময় রিফ্রেশ করুন (error হলেও)
            fetchFaculty();
        }
    };

    const handleEdit = async (fac) => {
        try {
            const { data } = await api.get(`/admin/faculty/${fac.id}`);
            setEditingFaculty(data);
            setFormData({
                full_name: data.full_name || '',
                employee_id: data.employee_id || '',
                designation: data.designation || '',
                department_id: data.department_id || '',
                faculty_category_id: data.faculty_category_id || '',
                specialization: data.specialization || '',
                qualification: data.qualification || '',
                teaching_experience: data.teaching_experience || '',
                biography: data.biography || '',
                research: data.research || '',
                official_email: data.official_email || '',
                official_phone: data.official_phone || '',
                public_profile_enabled: data.public_profile_enabled ?? true,
                is_featured: data.is_featured ?? false,
                is_active: data.is_active ?? true,
                display_order: data.display_order || 0,
                meta_title: data.meta_title || '',
                meta_description: data.meta_description || '',
                subjects: data.subjects?.map(s => s.id) || [],
                qualifications: data.qualifications || [],
                achievements: data.achievements || [],
                certifications: data.certifications || [],
                social_links: data.social_links || [],
                batches: (data.batches || []).map(b => ({ batch_id: b.id, subject: b.subject || b.FacultyBatch?.subject || '' })),
                create_user_account: false,
                email: data.user?.email || '',
                password: '',
            });
            setProfilePhoto(null);
            setDepartmentSearch('');
            setCategorySearch('');
            setShowModal(true);
        } catch (error) {
            logger.error('Failed to fetch faculty details:', error);
        }
    };

    const handleView = async (fac) => {
        try {
            const { data } = await api.get(`/admin/faculty/${fac.id}`);
            setViewFaculty(data);
        } catch (error) {
            logger.error('Failed to fetch faculty details:', error);
            notify.error('Failed to load faculty details');
        }
    };

    const handleDelete = async (id) => {
        const ok1 = await confirm({ title: "Delete Faculty?", message: "Are you sure you want to delete this faculty member?", confirmText: "Delete", variant: "destructive" }); if (ok1) {
            try {
                await api.delete(`/admin/faculty/${id}`);
                await fetchFaculty();
            } catch (error) {
                logger.error('Failed to delete faculty:', error);
                notify.error('Failed to delete faculty');
            }
        }
    };

    const handleRestore = async (id) => {
        try {
            await api.post(`/admin/faculty/${id}/restore`);
            await fetchFaculty();
        } catch (error) {
            logger.error('Failed to restore faculty:', error);
            notify.error('Failed to restore faculty');
        }
    };

    const handleToggleFeatured = async (id) => {
        try {
            await api.post(`/admin/faculty/${id}/toggle-featured`);
            await fetchFaculty();
        } catch (error) {
            logger.error('Failed to toggle featured:', error);
        }
    };

    const handleToggleActive = async (id) => {
        try {
            await api.post(`/admin/faculty/${id}/toggle-active`);
            await fetchFaculty();
        } catch (error) {
            logger.error('Failed to toggle active:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            full_name: '',
            employee_id: '',
            designation: '',
            department_id: '',
            faculty_category_id: '',
            specialization: '',
            qualification: '',
            teaching_experience: '',
            biography: '',
            research: '',
            official_email: '',
            official_phone: '',
            public_profile_enabled: true,
            is_featured: false,
            is_active: true,
            display_order: 0,
            meta_title: '',
            meta_description: '',
            subjects: [],
            qualifications: [],
            achievements: [],
            certifications: [],
            social_links: [],
            batches: [],
            create_user_account: false,
            email: '',
            password: '',
        });
        setProfilePhoto(null);
        setDepartmentSearch('');
        setCategorySearch('');
    };

    // ===================== Category handlers =====================
    const openAddCategory = () => {
        setEditingCategory(null);
        setCategoryForm({ name: '', description: '', is_active: true, display_order: 0 });
        setShowCategoryModal(true);
    };

    const openEditCategory = (cat) => {
        setEditingCategory(cat);
        setCategoryForm({ name: cat.name, description: cat.description || '', is_active: cat.is_active, display_order: cat.display_order || 0 });
        setShowCategoryModal(true);
    };

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        if (categorySaving) return;
        setCategorySaving(true);
        try {
            if (editingCategory) {
                await api.put(`/admin/faculty/categories/${editingCategory.id}`, categoryForm);
            } else {
                await api.post('/admin/faculty/categories', categoryForm);
            }
            await fetchCategories();
            setShowCategoryModal(false);
        } catch (error) {
            notify.error(error.response?.data?.message || 'Failed to save category');
        } finally {
            setCategorySaving(false);
        }
    };

    const handleDeleteCategory = async (id) => {
        const ok2 = await confirm({ title: "Delete Category?", message: "Delete this category? Faculty in it will be uncategorized.", confirmText: "Delete", variant: "destructive" }); if (ok2) {
            try {
                await api.delete(`/admin/faculty/categories/${id}`);
                await fetchCategories();
            } catch (error) {
                notify.error(error.response?.data?.message || 'Failed to delete category');
            }
        }
    };

    const addQualification = () => {
        setFormData({
            ...formData,
            qualifications: [...formData.qualifications, { degree: '', institution: '', field_of_study: '', passing_year: '', grade: '' }]
        });
    };

    const removeQualification = (index) => {
        setFormData({
            ...formData,
            qualifications: formData.qualifications.filter((_, i) => i !== index)
        });
    };

    const addAchievement = () => {
        setFormData({
            ...formData,
            achievements: [...formData.achievements, { title: '', description: '', date: '', category: '' }]
        });
    };

    const removeAchievement = (index) => {
        setFormData({
            ...formData,
            achievements: formData.achievements.filter((_, i) => i !== index)
        });
    };

    const addCertification = () => {
        setFormData({
            ...formData,
            certifications: [...formData.certifications, { name: '', issuing_organization: '', issue_date: '', expiry_date: '', certificate_url: '' }]
        });
    };

    const removeCertification = (index) => {
        setFormData({
            ...formData,
            certifications: formData.certifications.filter((_, i) => i !== index)
        });
    };

    const addSocialLink = () => {
        setFormData({
            ...formData,
            social_links: [...formData.social_links, { platform: '', url: '' }]
        });
    };

    const removeSocialLink = (index) => {
        setFormData({
            ...formData,
            social_links: formData.social_links.filter((_, i) => i !== index)
        });
    };

    const addBatch = () => {
        setFormData({
            ...formData,
            batches: [...formData.batches, { batch_id: '', subject: '' }]
        });
    };

    const removeBatch = (index) => {
        setFormData({
            ...formData,
            batches: formData.batches.filter((_, i) => i !== index)
        });
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="section-header">
                <div>
                    <h1 className="text-lg md:text-2xl font-bold text-primary">Faculty Showcase Management</h1>
                    <p className="text-xs md:text-sm text-gray-500">Manage faculty profiles displayed on the public website</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button onClick={openAddCategory} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                        <Tag size={16} /> Categories
                    </button>
                    <button onClick={() => { setShowModal(true); resetForm(); setEditingFaculty(null); }} className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg text-sm hover:bg-[#1a3d66] transition-colors flex items-center justify-center gap-2">
                        <Plus size={16} /> Add Faculty
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4">
                    <div className="relative col-span-2 md:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Search faculty..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchFaculty(); }} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent" />
                    </div>
                    <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent">
                        <option value="">All Depts</option>
                        {departments.map((dept) => (<option key={dept.id} value={dept.id}>{dept.name}</option>))}
                    </select>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent">
                        <option value="">All Cats</option>
                        {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                    </select>
                    <select value={filterFeatured} onChange={(e) => setFilterFeatured(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent">
                        <option value="">All Status</option>
                        <option value="true">Featured</option>
                        <option value="false">Not Featured</option>
                    </select>
                    <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent">
                            <option value="">All</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                        <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                            <input type="checkbox" checked={showTrashed} onChange={(e) => setShowTrashed(e.target.checked)} className="w-3.5 h-3.5 text-[#1F4E79] rounded focus:ring-[#1F4E79]" />
                            <span className="text-[11px] text-gray-600">Trashed</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Faculty List (Desktop) */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Faculty</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Designation</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Department</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Category</th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Featured</th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Active</th>
                            <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {faculty.map((fac) => (
                            <tr key={fac.id} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {fac.profile_photo_path ? (
                                            <img src={buildAssetUrl(fac.profile_photo_path)} alt={fac.full_name} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} className="h-10 w-10 rounded-full object-cover" />
                                        ) : null}
                                        <div className="h-10 w-10 rounded-full bg-[#1F4E79] flex items-center justify-center text-white font-bold" style={{ display: fac.profile_photo_path ? 'none' : 'flex' }}>{fac.full_name?.charAt(0).toUpperCase()}</div>
                                        <div>
                                            <p className="font-medium text-gray-800 text-sm">{fac.full_name}</p>
                                            {fac.employee_id && <p className="text-xs text-gray-500">ID: {fac.employee_id}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{fac.designation}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{fac.department?.name || '—'}</td>
                                <td className="px-4 py-3">{fac.category ? <span className="px-2 py-1 bg-[#1F4E79]/10 text-[#1F4E79] rounded text-xs">{fac.category.name}</span> : <span className="text-gray-400 text-sm">—</span>}</td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => handleToggleFeatured(fac.id)} className={`p-1 rounded ${fac.is_featured ? 'text-yellow-500' : 'text-gray-300'}`}><Star size={18} fill={fac.is_featured ? "currentColor" : "none"} /></button>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => handleToggleActive(fac.id)} className={`p-1 rounded ${fac.is_active ? 'text-green-500' : 'text-gray-300'}`}>{fac.is_active ? <Eye size={18} /> : <EyeOff size={18} />}</button>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => handleView(fac)} className="p-1 text-gray-500 hover:text-[#1F4E79] transition-colors" title="View Details"><Eye size={18} /></button>
                                        <button onClick={() => handleEdit(fac)} className="p-1 text-gray-500 hover:text-[#1F4E79] transition-colors" title="Edit"><Edit size={18} /></button>
                                        {showTrashed ? (
                                            <button onClick={() => handleRestore(fac.id)} className="p-1 text-gray-500 hover:text-green-600 transition-colors">Restore</button>
                                        ) : (
                                            <button onClick={() => handleDelete(fac.id)} className="p-1 text-gray-500 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {faculty.length === 0 && (
                    <div className="p-12 text-center text-gray-500"><Users size={48} className="mx-auto mb-4 text-gray-300" /><p>No faculty members found</p></div>
                )}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-1.5">
                {faculty.map((fac) => (
                    <div key={fac.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                            {fac.profile_photo_path ? (
                                <img src={buildAssetUrl(fac.profile_photo_path)} alt={fac.full_name} onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }} className="h-8 w-8 rounded-full object-cover shrink-0" />
                            ) : null}
                            <div className="h-8 w-8 rounded-full bg-[#1F4E79] flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ display: fac.profile_photo_path ? 'none' : 'flex' }}>{fac.full_name?.charAt(0).toUpperCase()}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="font-semibold text-gray-800 text-[13px] truncate">{fac.full_name}</p>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => handleToggleFeatured(fac.id)} className={`${fac.is_featured ? 'text-yellow-500' : 'text-gray-300'}`}><Star size={12} fill={fac.is_featured ? "currentColor" : "none"} /></button>
                                        <button onClick={() => handleToggleActive(fac.id)} className={`${fac.is_active ? 'text-green-500' : 'text-gray-300'}`}>{fac.is_active ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-500 truncate">{fac.designation}{fac.department ? ` · ${fac.department.name}` : ''}</p>
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                                <button onClick={() => handleView(fac)} className="p-1 text-gray-400 hover:text-[#1F4E79] rounded"><Eye size={13} /></button>
                                <button onClick={() => handleEdit(fac)} className="p-1 text-gray-400 hover:text-[#1F4E79] rounded"><Edit size={13} /></button>
                                {showTrashed ? (
                                    <button onClick={() => handleRestore(fac.id)} className="p-1 text-[11px] text-green-600 hover:bg-green-50 rounded">Rstr</button>
                                ) : (
                                    <button onClick={() => handleDelete(fac.id)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={13} /></button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {faculty.length === 0 && (
                    <div className="py-8 text-center text-gray-400"><Users size={28} className="mx-auto mb-2 text-gray-300" /><p className="text-xs">No faculty members found</p></div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 responsive-modal">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex items-center justify-between">
                            <h2 className="text-base md:text-xl font-bold text-gray-800">
                                {editingFaculty ? 'Edit Faculty' : 'Add New Faculty'}
                            </h2>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Photo Upload */}
                            <div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
                                    <input
                                        type="file"
                                        accept="image/jpg,image/jpeg,image/png,image/webp"
                                        onChange={(e) => setProfilePhoto(e.target.files[0])}
                                        className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#1F4E79] file:text-white hover:file:bg-[#1a3d66]"
                                    />
                                    {profilePhoto && <p className="text-xs text-green-600 mt-1">Selected: {profilePhoto.name}</p>}
                                </div>
                            </div>

                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                        <input
                                            type="text"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                                        <input
                                            type="text"
                                            value={formData.employee_id}
                                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                                        <input
                                            type="text"
                                            value={formData.designation}
                                            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search departments..."
                                                value={departmentSearch}
                                                onChange={(e) => setDepartmentSearch(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-t-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent text-sm"
                                            />
                                            <select
                                                value={formData.department_id}
                                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                                className="w-full px-4 py-2 border border-t-0 border-gray-300 rounded-b-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                            >
                                                <option value="">Select Department</option>
                                                {departments
                                                    .filter(dept => 
                                                        dept.name.toLowerCase().includes(departmentSearch.toLowerCase()) ||
                                                        dept.description?.toLowerCase().includes(departmentSearch.toLowerCase())
                                                    )
                                                    .map((dept) => (
                                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search categories..."
                                                value={categorySearch}
                                                onChange={(e) => setCategorySearch(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-t-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent text-sm"
                                            />
                                            <select
                                                value={formData.faculty_category_id}
                                                onChange={(e) => setFormData({ ...formData, faculty_category_id: e.target.value })}
                                                className="w-full px-4 py-2 border border-t-0 border-gray-300 rounded-b-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                            >
                                                <option value="">Select Category</option>
                                                {categories
                                                    .filter(cat => 
                                                        cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                                                        cat.description?.toLowerCase().includes(categorySearch.toLowerCase())
                                                    )
                                                    .map((cat) => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                                        <input
                                            type="text"
                                            value={formData.specialization}
                                            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                                        <input
                                            type="text"
                                            value={formData.qualification}
                                            onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Teaching Experience (Years)</label>
                                        <input
                                            type="number"
                                            value={formData.teaching_experience}
                                            onChange={(e) => setFormData({ ...formData, teaching_experience: e.target.value })}
                                            min="0"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Biography</label>
                                    <textarea
                                        value={formData.biography}
                                        onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800">Contact Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Official Email</label>
                                        <input
                                            type="email"
                                            value={formData.official_email}
                                            onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Official Phone</label>
                                        <input
                                            type="text"
                                            value={formData.official_phone}
                                            onChange={(e) => setFormData({ ...formData, official_phone: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Subjects */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800">Subjects</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {subjects.map((subject) => (
                                        <label key={subject.id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={formData.subjects.includes(subject.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, subjects: [...formData.subjects, subject.id] });
                                                    } else {
                                                        setFormData({ ...formData, subjects: formData.subjects.filter(id => id !== subject.id) });
                                                    }
                                                }}
                                                className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]"
                                            />
                                            <span className="text-sm text-gray-700">{subject.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Qualifications */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800">Qualifications</h3>
                                    <button type="button" onClick={addQualification} className="text-[#1F4E79] hover:underline text-sm">+ Add Qualification</button>
                                </div>
                                {formData.qualifications.map((qual, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-4 bg-gray-50 rounded-lg">
                                        <input
                                            type="text"
                                            placeholder="Degree"
                                            value={qual.degree}
                                            onChange={(e) => {
                                                const newQuals = [...formData.qualifications];
                                                newQuals[index].degree = e.target.value;
                                                setFormData({ ...formData, qualifications: newQuals });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Institution"
                                            value={qual.institution}
                                            onChange={(e) => {
                                                const newQuals = [...formData.qualifications];
                                                newQuals[index].institution = e.target.value;
                                                setFormData({ ...formData, qualifications: newQuals });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Field of Study"
                                            value={qual.field_of_study}
                                            onChange={(e) => {
                                                const newQuals = [...formData.qualifications];
                                                newQuals[index].field_of_study = e.target.value;
                                                setFormData({ ...formData, qualifications: newQuals });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Year"
                                            value={qual.passing_year}
                                            onChange={(e) => {
                                                const newQuals = [...formData.qualifications];
                                                newQuals[index].passing_year = e.target.value;
                                                setFormData({ ...formData, qualifications: newQuals });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Grade"
                                            value={qual.grade}
                                            onChange={(e) => {
                                                const newQuals = [...formData.qualifications];
                                                newQuals[index].grade = e.target.value;
                                                setFormData({ ...formData, qualifications: newQuals });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button type="button" onClick={() => removeQualification(index)} className="text-red-500 hover:text-red-700">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Achievements */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800">Achievements</h3>
                                    <button type="button" onClick={addAchievement} className="text-[#1F4E79] hover:underline text-sm">+ Add Achievement</button>
                                </div>
                                {formData.achievements.map((ach, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-4 bg-gray-50 rounded-lg">
                                        <input
                                            type="text"
                                            placeholder="Title"
                                            value={ach.title}
                                            onChange={(e) => {
                                                const newAch = [...formData.achievements];
                                                newAch[index].title = e.target.value;
                                                setFormData({ ...formData, achievements: newAch });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Category"
                                            value={ach.category}
                                            onChange={(e) => {
                                                const newAch = [...formData.achievements];
                                                newAch[index].category = e.target.value;
                                                setFormData({ ...formData, achievements: newAch });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="date"
                                            placeholder="Date"
                                            value={ach.date}
                                            onChange={(e) => {
                                                const newAch = [...formData.achievements];
                                                newAch[index].date = e.target.value;
                                                setFormData({ ...formData, achievements: newAch });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Description"
                                            value={ach.description}
                                            onChange={(e) => {
                                                const newAch = [...formData.achievements];
                                                newAch[index].description = e.target.value;
                                                setFormData({ ...formData, achievements: newAch });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button type="button" onClick={() => removeAchievement(index)} className="text-red-500 hover:text-red-700">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Batches */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800">Assigned Batches</h3>
                                    <button type="button" onClick={addBatch} className="text-[#1F4E79] hover:underline text-sm">+ Add Batch</button>
                                </div>
                                {formData.batches.map((batch, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg">
                                        <select
                                            value={batch.batch_id}
                                            onChange={(e) => {
                                                const newBatches = [...formData.batches];
                                                newBatches[index].batch_id = e.target.value;
                                                setFormData({ ...formData, batches: newBatches });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        >
                                            <option value="">Select Batch</option>
                                            {batches.map((b) => (
                                                <option key={b.id} value={b.id}>{b.name} - {b.course?.title}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="Subject"
                                            value={batch.subject}
                                            onChange={(e) => {
                                                const newBatches = [...formData.batches];
                                                newBatches[index].subject = e.target.value;
                                                setFormData({ ...formData, batches: newBatches });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button type="button" onClick={() => removeBatch(index)} className="text-red-500 hover:text-red-700">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Certifications */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800">Certifications</h3>
                                    <button type="button" onClick={addCertification} className="text-[#1F4E79] hover:underline text-sm">+ Add Certification</button>
                                </div>
                                {formData.certifications.map((cert, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-4 bg-gray-50 rounded-lg">
                                        <input
                                            type="text"
                                            placeholder="Name"
                                            value={cert.name}
                                            onChange={(e) => {
                                                const newCerts = [...formData.certifications];
                                                newCerts[index].name = e.target.value;
                                                setFormData({ ...formData, certifications: newCerts });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Issuing Organization"
                                            value={cert.issuing_organization}
                                            onChange={(e) => {
                                                const newCerts = [...formData.certifications];
                                                newCerts[index].issuing_organization = e.target.value;
                                                setFormData({ ...formData, certifications: newCerts });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="date"
                                            placeholder="Issue Date"
                                            value={cert.issue_date}
                                            onChange={(e) => {
                                                const newCerts = [...formData.certifications];
                                                newCerts[index].issue_date = e.target.value;
                                                setFormData({ ...formData, certifications: newCerts });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="date"
                                            placeholder="Expiry Date"
                                            value={cert.expiry_date}
                                            onChange={(e) => {
                                                const newCerts = [...formData.certifications];
                                                newCerts[index].expiry_date = e.target.value;
                                                setFormData({ ...formData, certifications: newCerts });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Certificate URL"
                                            value={cert.certificate_url}
                                            onChange={(e) => {
                                                const newCerts = [...formData.certifications];
                                                newCerts[index].certificate_url = e.target.value;
                                                setFormData({ ...formData, certifications: newCerts });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button type="button" onClick={() => removeCertification(index)} className="text-red-500 hover:text-red-700">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Social Links */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-800">Social Links</h3>
                                    <button type="button" onClick={addSocialLink} className="text-[#1F4E79] hover:underline text-sm">+ Add Social Link</button>
                                </div>
                                {formData.social_links.map((link, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg">
                                        <select
                                            value={link.platform}
                                            onChange={(e) => {
                                                const newLinks = [...formData.social_links];
                                                newLinks[index].platform = e.target.value;
                                                setFormData({ ...formData, social_links: newLinks });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        >
                                            <option value="">Select Platform</option>
                                            <option value="facebook">Facebook</option>
                                            <option value="linkedin">LinkedIn</option>
                                            <option value="youtube">YouTube</option>
                                            <option value="twitter">Twitter</option>
                                            <option value="instagram">Instagram</option>
                                            <option value="website">Website</option>
                                        </select>
                                        <input
                                            type="url"
                                            placeholder="URL"
                                            value={link.url}
                                            onChange={(e) => {
                                                const newLinks = [...formData.social_links];
                                                newLinks[index].url = e.target.value;
                                                setFormData({ ...formData, social_links: newLinks });
                                            }}
                                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button type="button" onClick={() => removeSocialLink(index)} className="text-red-500 hover:text-red-700">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Research & Publications */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800">Research & Publications</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Research Interests</label>
                                    <textarea
                                        value={formData.research}
                                        onChange={(e) => setFormData({ ...formData, research: e.target.value })}
                                        rows={2}
                                        placeholder="Enter research interests..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* SEO Settings */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800">SEO Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                                        <input
                                            type="text"
                                            value={formData.meta_title}
                                            onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                                            placeholder="SEO Title"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                                        <input
                                            type="text"
                                            value={formData.meta_description}
                                            onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                                            placeholder="SEO Description"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Visibility Settings */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800">Visibility Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.public_profile_enabled}
                                            onChange={(e) => setFormData({ ...formData, public_profile_enabled: e.target.checked })}
                                            className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]"
                                        />
                                        <span className="text-sm text-gray-700">Public Profile Enabled</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_featured}
                                            onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                                            className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]"
                                        />
                                        <span className="text-sm text-gray-700">Featured</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]"
                                        />
                                        <span className="text-sm text-gray-700">Active</span>
                                    </label>
                                </div>
                            </div>

                            {/* User Account Creation */}
                            <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                                <h3 className="font-bold text-gray-800">Teacher Account</h3>
                                {!editingFaculty ? (
                                    <>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={formData.create_user_account}
                                                onChange={(e) => setFormData({ ...formData, create_user_account: e.target.checked })}
                                                className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]"
                                            />
                                            <span className="text-sm text-gray-700">Create login account for this teacher</span>
                                        </label>
                                        {formData.create_user_account && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                                    <input
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                        required={formData.create_user_account}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                                    <PasswordInput
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        required={formData.create_user_account}
                                                        minLength={8}
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {editingFaculty?.user ? (
                                            <div className="space-y-4">
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">Current Account:</span> {editingFaculty.user.email}
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Update Email (optional)</label>
                                                        <input
                                                            type="email"
                                                            value={formData.email}
                                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
                                                        <PasswordInput
                                                            value={formData.password}
                                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                            minLength={8}
                                                            placeholder="Leave blank to keep current password"
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <p className="text-sm text-gray-600">This faculty member does not have a login account yet.</p>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.create_user_account}
                                                        onChange={(e) => setFormData({ ...formData, create_user_account: e.target.checked })}
                                                        className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]"
                                                    />
                                                    <span className="text-sm text-gray-700">Create login account for this teacher</span>
                                                </label>
                                                {formData.create_user_account && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                                            <input
                                                                type="email"
                                                                value={formData.email}
                                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                                required={formData.create_user_account}
                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                                            <PasswordInput
                                                                value={formData.password}
                                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                                required={formData.create_user_account}
                                                                minLength={8}
                                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Submit */}
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); setEditingFaculty(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors disabled:opacity-50">
                                    {saving ? 'Saving...' : (editingFaculty ? 'Update' : 'Create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {viewFaculty && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 responsive-modal">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex items-center justify-between">
                            <h2 className="text-base md:text-xl font-bold text-gray-800">Faculty Details</h2>
                            <button onClick={() => setViewFaculty(null)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row gap-6">
                                {viewFaculty.profile_photo_path ? (
                                    <img src={buildAssetUrl(viewFaculty.profile_photo_path)} alt={viewFaculty.full_name} className="h-28 w-28 rounded-xl object-cover border border-gray-200" />
                                ) : (
                                    <div className="h-28 w-28 rounded-xl bg-[#E6EEF5] flex items-center justify-center border border-gray-200">
                                        <User size={48} className="text-[#1F4E79]" />
                                    </div>
                                )}
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-gray-800">{viewFaculty.full_name}</h3>
                                    <p className="text-[#1F4E79] font-medium">{viewFaculty.designation}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {viewFaculty.category && (
                                            <span className="px-2 py-1 bg-[#1F4E79]/10 text-[#1F4E79] rounded text-xs">{viewFaculty.category.name}</span>
                                        )}
                                        {viewFaculty.department && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{viewFaculty.department.name}</span>
                                        )}
                                        {viewFaculty.is_featured && (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs flex items-center gap-1"><Star size={12} fill="currentColor" /> Featured</span>
                                        )}
                                        <span className={`px-2 py-1 rounded text-xs ${viewFaculty.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {viewFaculty.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact */}
                            {(viewFaculty.official_email || viewFaculty.official_phone) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {viewFaculty.official_email && (
                                        <div className="flex items-center gap-2 text-gray-600"><Mail size={16} className="text-[#1F4E79]" /> {viewFaculty.official_email}</div>
                                    )}
                                    {viewFaculty.official_phone && (
                                        <div className="flex items-center gap-2 text-gray-600"><Phone size={16} className="text-[#1F4E79]" /> {viewFaculty.official_phone}</div>
                                    )}
                                </div>
                            )}

                            {/* Basic Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {viewFaculty.specialization && (
                                    <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500 uppercase">Specialization</p><p className="text-gray-800 text-sm">{viewFaculty.specialization}</p></div>
                                )}
                                {viewFaculty.qualification && (
                                    <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500 uppercase">Qualification</p><p className="text-gray-800 text-sm">{viewFaculty.qualification}</p></div>
                                )}
                                {viewFaculty.teaching_experience > 0 && (
                                    <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500 uppercase">Experience</p><p className="text-gray-800 text-sm">{viewFaculty.teaching_experience} Years</p></div>
                                )}
                                {viewFaculty.employee_id && (
                                    <div className="p-3 bg-gray-50 rounded-lg"><p className="text-xs text-gray-500 uppercase">Employee ID</p><p className="text-gray-800 text-sm">{viewFaculty.employee_id}</p></div>
                                )}
                            </div>

                            {/* Biography */}
                            {viewFaculty.biography && (
                                <div><h4 className="font-bold text-gray-800 mb-2">Biography</h4><p className="text-gray-600 text-sm leading-relaxed">{viewFaculty.biography}</p></div>
                            )}

                            {/* Subjects */}
                            {viewFaculty.subjects?.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><BookOpen size={16} className="text-[#1F4E79]" /> Subjects</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {viewFaculty.subjects.map((s) => <span key={s.id} className="px-3 py-1 bg-[#E6EEF5] text-[#1F4E79] rounded-full text-sm">{s.name}</span>)}
                                    </div>
                                </div>
                            )}

                            {/* Qualifications */}
                            {viewFaculty.qualifications?.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Award size={16} className="text-[#1F4E79]" /> Qualifications</h4>
                                    <div className="space-y-2">
                                        {viewFaculty.qualifications.map((q, i) => (
                                            <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                                                <p className="font-medium text-gray-800">{q.degree}{q.field_of_study ? ` - ${q.field_of_study}` : ''}</p>
                                                <p className="text-gray-600">{q.institution}{q.passing_year ? ` (${q.passing_year})` : ''}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Achievements */}
                            {viewFaculty.achievements?.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Award size={16} className="text-[#1F4E79]" /> Achievements</h4>
                                    <div className="space-y-2">
                                        {viewFaculty.achievements.map((a, i) => (
                                            <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                                                <p className="font-medium text-gray-800">{a.title}</p>
                                                {a.description && <p className="text-gray-600">{a.description}</p>}
                                                {a.date && <p className="text-gray-500 text-xs mt-1">{a.date}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Certifications */}
                            {viewFaculty.certifications?.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Award size={16} className="text-[#1F4E79]" /> Certifications</h4>
                                    <div className="space-y-2">
                                        {viewFaculty.certifications.map((c, i) => (
                                            <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                                                <p className="font-medium text-gray-800">{c.name}</p>
                                                <p className="text-gray-600">{c.issuing_organization}{c.issue_date ? ` - ${c.issue_date}` : ''}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Batches */}
                            {viewFaculty.batches?.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Users size={16} className="text-[#1F4E79]" /> Assigned Batches</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {viewFaculty.batches.map((b, i) => (
                                            <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                                                <p className="font-medium text-gray-800">{b.batch?.name || b.name || 'Batch'}</p>
                                                {b.subject && <p className="text-[#1F4E79] text-xs">Subject: {b.subject}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Linked User Account */}
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-bold text-gray-800 mb-1">Login Account</h4>
                                {viewFaculty.user ? (
                                    <p className="text-sm text-gray-700">{viewFaculty.user.email}</p>
                                ) : (
                                    <p className="text-sm text-gray-500">No login account linked</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 responsive-modal">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex items-center justify-between">
                            <h2 className="text-base md:text-xl font-bold text-gray-800">Manage Faculty Categories</h2>
                            <button onClick={() => setShowCategoryModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Add/Edit Category Form */}
                            <form onSubmit={handleCategorySubmit} className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-bold text-gray-800">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Category Name *"
                                        required
                                        value={categoryForm.name}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Display Order"
                                        value={categoryForm.display_order}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, display_order: e.target.value })}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Description (optional)"
                                    value={categoryForm.description}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                />
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={categoryForm.is_active}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                                        className="w-4 h-4 text-[#1F4E79] rounded focus:ring-[#1F4E79]"
                                    />
                                    <span className="text-sm text-gray-700">Active</span>
                                </label>
                                <div className="flex gap-2">
                                    <button type="submit" disabled={categorySaving} className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                                        {categorySaving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : (editingCategory ? 'Update Category' : 'Add Category')}
                                    </button>
                                    {editingCategory && (
                                        <button type="button" onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '', is_active: true, display_order: 0 }); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                                            Cancel Edit
                                        </button>
                                    )}
                                </div>
                            </form>

                            {/* Category List */}
                            <div className="space-y-2">
                                {categories.length === 0 ? (
                                    <p className="text-center text-gray-500 py-4">No categories yet</p>
                                ) : (
                                    categories.map((cat) => (
                                        <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-800">{cat.name}</p>
                                                {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {cat.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => openEditCategory(cat)} className="p-1 text-gray-500 hover:text-[#1F4E79]">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 text-gray-500 hover:text-red-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
