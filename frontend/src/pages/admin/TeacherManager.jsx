import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { BANGLADESH_SUBJECTS } from "../../data/subjects";
import {
  Plus, MoreVertical, Trash2, Search, User, Edit, X, KeyRound,
  Mail, Phone, BookOpen, Layers, ChevronDown, Calendar, FileText, Upload,
} from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import PasswordInput from "../../components/common/PasswordInput";
import logger from '../../services/logger';

const EMPTY = { name: '', email: '', phone: '', designation: '', subject: '', password: '', bio: '', joining_date: '' };
const GROUP_LABELS = {
  'Bangla': 'Compulsory',
  'English': 'Compulsory',
  'Information': 'Compulsory',
  'Physics': 'Science',
  'Chemistry': 'Science',
  'Biology': 'Science',
  'Higher Mathematics': 'Science',
  'General Science': 'Science',
  'Accounting': 'Commerce',
  'Business': 'Commerce',
  'Finance': 'Commerce',
  'Economics': 'Commerce',
  'Production': 'Commerce',
  'Statistics': 'Commerce',
  'History': 'Humanities',
  'Civics': 'Humanities',
  'Social Work': 'Humanities',
  'Sociology': 'Humanities',
  'Geography': 'Humanities',
  'Islamic History': 'Humanities',
  'Philosophy': 'Humanities',
  'Logic': 'Humanities',
  'Psychology': 'Humanities',
  'Mathematics': 'General',
  'Bangladesh': 'General',
  'Agricultural': 'General',
  'Home Science': 'General',
  'Physical Education': 'General',
  'Health Science': 'General',
  'Islamic Studies': 'Religious Studies',
  'Hindu Studies': 'Religious Studies',
  'Buddhist Studies': 'Religious Studies',
  'Christian Studies': 'Religious Studies',
  'Arabic': 'Languages',
  'Sanskrit': 'Languages',
  'Pali': 'Languages',
  'Fine Arts': 'Arts',
  'Music': 'Arts',
};

const LABEL_COLORS = {
  'Compulsory': 'bg-red-100 text-red-700',
  'Science': 'bg-blue-100 text-blue-700',
  'Commerce': 'bg-green-100 text-green-700',
  'Humanities': 'bg-purple-100 text-purple-700',
  'General': 'bg-gray-100 text-gray-700',
  'Religious Studies': 'bg-amber-100 text-amber-700',
  'Languages': 'bg-teal-100 text-teal-700',
  'Arts': 'bg-pink-100 text-pink-700',
};

function SubjectSelect({ value, onChange, placeholder = "Select subject...", required = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search
    ? BANGLADESH_SUBJECTS.filter(s => s.toLowerCase().includes(search.toLowerCase()))
    : BANGLADESH_SUBJECTS;

  const getGroupLabel = (subject) => {
    for (const [key, label] of Object.entries(GROUP_LABELS)) {
      if (subject.startsWith(key)) return label;
    }
    return 'Other';
  };

  const grouped = {};
  filtered.forEach(s => {
    const g = getGroupLabel(s);
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(s);
  });
  const groupOrder = ['Compulsory', 'Science', 'Commerce', 'Humanities', 'General', 'Religious Studies', 'Languages', 'Arts', 'Other'];

  return (
    <div className="relative">
      <div
        className="w-full flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:border-primary transition-colors bg-white"
        onClick={() => setOpen(!open)}
      >
        <BookOpen size={15} className="text-gray-400 shrink-0" />
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>{value || placeholder}</span>
        <ChevronDown size={14} className={`ml-auto text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                autoFocus
                placeholder="Type to search..."
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:border-primary outline-none"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="overflow-y-auto max-h-52">
              {search && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 italic"
                  onClick={() => { onChange(search); setOpen(false); setSearch(''); }}
                >
                  Use "{search}"
                </button>
              )}
              {groupOrder.map(group => {
                const items = grouped[group];
                if (!items || items.length === 0) return null;
                return (
                  <div key={group}>
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">
                      {group}
                    </div>
                    {items.map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2 ${value === s ? 'bg-primary/5 text-primary font-medium' : 'text-gray-700'}`}
                        onClick={() => { onChange(s); setOpen(false); setSearch(''); }}
                      >
                        <span>{s}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${LABEL_COLORS[group] || 'bg-gray-100 text-gray-600'}`}>
                          {group}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">No subjects match "{search}"</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TeacherManager() {
  const confirm = useConfirm();
  const [teachers, setTeachers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formData, setFormData] = useState(EMPTY);
  const [assignments, setAssignments] = useState([]);
  const [newBatchId, setNewBatchId] = useState('');
  const [newBatchSubject, setNewBatchSubject] = useState('');
  const [menuPos, setMenuPos] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/admin/teachers');
      setTeachers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      logger.error('Failed to fetch teachers:', err);
    }
  };

  useEffect(() => {
    fetchTeachers();
    api.get('/admin/batches').then(res => setBatches(Array.isArray(res.data) ? res.data : [])).catch(() => {});
    const handler = (e) => {
      if (!e.target.closest(".action-menu-btn")) setMenuPos(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const openAddModal = () => {
    setEditingTeacher(null);
    setFormData(EMPTY);
    setAssignments([]);
    setNewBatchId('');
    setNewBatchSubject('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditingTeacher(t);
    setFormData({
      name: t.name || '',
      email: t.email || '',
      phone: t.phone || '',
      designation: t.TeacherProfile?.designation || '',
      subject: t.TeacherProfile?.subject || '',
      bio: t.TeacherProfile?.bio || '',
      joining_date: t.TeacherProfile?.joining_date || '',
      password: '',
    });
    setAssignments(
      (t.TeacherBatchAssignments || []).map(ba => ({
        batch_id: ba.batch_id,
        batch_label: ba.Batch ? `${ba.Batch.course?.title || ''} - ${ba.Batch.name}` : `Batch #${ba.batch_id}`,
        subject: ba.subject,
      }))
    );
    setNewBatchId('');
    setNewBatchSubject('');
    setPhotoFile(null);
    setPhotoPreview(buildAssetUrl(t.profile_photo_path) || null);
    setIsModalOpen(true);
  };

  const addAssignment = () => {
    if (!newBatchId || !newBatchSubject.trim()) return;
    const b = batches.find(b => b.id == newBatchId);
    if (assignments.some(a => a.batch_id == newBatchId && a.subject.trim().toLowerCase() === newBatchSubject.trim().toLowerCase())) {
      notify.warning('This subject is already assigned for this batch.');
      return;
    }
    setAssignments(prev => [...prev, {
      batch_id: Number(newBatchId),
      batch_label: b ? `${b.course?.title || ''} - ${b.name}` : `Batch #${newBatchId}`,
      subject: newBatchSubject.trim(),
    }]);
    setNewBatchId('');
    setNewBatchSubject('');
  };

  const removeAssignment = (index) => {
    setAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        batch_assignments: assignments.map(a => ({ batch_id: a.batch_id, subject: a.subject })),
      };
      if (!payload.password) delete payload.password;
      if (!payload.bio) payload.bio = '';
      if (!payload.joining_date) delete payload.joining_date;

      let teacherId = editingTeacher?.id;
      if (editingTeacher) {
        await api.put(`/admin/teachers/${editingTeacher.id}`, payload);
      } else {
        const res = await api.post('/admin/teachers', payload);
        teacherId = res.data?.data?.id ?? res.data?.id;
      }

      if (photoFile && teacherId) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        await api.post(`/admin/teachers/${teacherId}/photo`, fd);
      }

      await fetchTeachers();
      setIsModalOpen(false);
      setFormData(EMPTY);
      setAssignments([]);
      setEditingTeacher(null);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      notify.error(error.response?.data?.message || "Failed to save teacher");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: "Delete Teacher?", message: "Delete this teacher account? This will remove their login access.", confirmText: "Delete", variant: "destructive" }); if (ok) {
      try {
        await api.delete(`/admin/teachers/${id}`);
        await fetchTeachers();
      } catch (error) {
        notify.error(error.response?.data?.message || "Failed to delete teacher");
      }
    }
  };

  const handleResetPassword = async (t) => {
    const newPass = prompt(`Enter new password for ${t.name} (min 8 characters):`);
    if (!newPass || newPass.length < 8) {
      if (newPass !== null) notify.warning("Password must be at least 8 characters");
      return;
    }
    try {
      await api.put(`/admin/teachers/${t.id}`, { password: newPass });
      notify.success("Password reset successfully");
    } catch (error) {
      notify.error(error.response?.data?.message || "Failed to reset password");
    }
  };

  const filteredTeachers = teachers.filter(t =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-primary">Teachers & Staff</h1>
          <p className="text-xs md:text-sm text-gray-500">Manage teacher login accounts (portal access)</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:border-primary outline-none text-sm bg-white" onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={openAddModal} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors shadow-sm w-full sm:w-auto">
            <Plus size={16} /> Add Teacher
          </button>
        </div>
      </div>

      {/* Teachers Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">Name & Email</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">Designation</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">Subject</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">Batch</th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeachers.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {buildAssetUrl(t.profile_photo_path) ? (
                        <img src={buildAssetUrl(t.profile_photo_path)} alt={t.name} className="h-10 w-10 rounded-full object-cover shrink-0 shadow-sm" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">{t.name?.charAt(0).toUpperCase()}</div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{t.name}</p>
                        <p className="text-xs text-gray-400 truncate">{t.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><span className="text-sm text-gray-600">{t.TeacherProfile?.designation || '—'}</span></td>
                  <td className="px-5 py-4"><span className="text-sm text-gray-600">{t.TeacherProfile?.subject || '—'}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(t.TeacherBatchAssignments || []).length > 0 ? t.TeacherBatchAssignments.map(ba => (
                        <span key={ba.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[11px] font-medium border border-blue-100">
                          <Layers size={10} />{ba.Batch ? `${ba.Batch.course?.title || ''} - ${ba.Batch.name}` : `Batch #${ba.batch_id}`}
                        </span>
                      )) : <span className="text-sm text-gray-300">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${t.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />{t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="action-menu-btn p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors" onClick={(e) => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); const rect = e.currentTarget.getBoundingClientRect(); setMenuPos(menuPos ? null : { top: rect.bottom + 4, right: window.innerWidth - rect.right, teacher: t }); }}>
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTeachers.length === 0 && (
          <div className="py-16 text-center"><User size={48} className="mx-auto mb-4 text-gray-200" /><p className="text-gray-400 text-sm">No teachers found</p></div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-1.5">
        {filteredTeachers.map(t => (
          <div key={t.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              {buildAssetUrl(t.profile_photo_path) ? (
                <img src={buildAssetUrl(t.profile_photo_path)} alt={t.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">{t.name?.charAt(0).toUpperCase()}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="font-semibold text-gray-800 text-[13px] truncate">{t.name}</p>
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${t.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <p className="text-[11px] text-gray-400 truncate">{t.email} · {t.TeacherProfile?.designation || '—'}</p>
                {(t.TeacherBatchAssignments || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.TeacherBatchAssignments.slice(0, 2).map(ba => (
                      <span key={ba.id} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{ba.Batch ? ba.Batch.name : `#${ba.batch_id}`}</span>
                    ))}
                    {t.TeacherBatchAssignments.length > 2 && <span className="text-[10px] text-gray-400">+{t.TeacherBatchAssignments.length - 2}</span>}
                  </div>
                )}
              </div>
              <div className="flex gap-0.5 shrink-0">
                <button onClick={() => openEditModal(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={13} /></button>
                <button className="p-1.5 text-gray-400 hover:bg-gray-100 rounded" onClick={(e) => { setMenuPos(menuPos ? null : { top: 0, right: 0, teacher: t }); }}>
                  <MoreVertical size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredTeachers.length === 0 && (
          <div className="py-8 text-center"><User size={28} className="mx-auto mb-2 text-gray-200" /><p className="text-gray-400 text-xs">No teachers found</p></div>
        )}
      </div>

      {/* Floating action menu */}
      {menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuPos(null)} />
          <div className="fixed z-50 w-48 bg-white border border-gray-200 shadow-lg rounded-xl py-1.5 overflow-hidden"
            style={{ top: menuPos.top, right: menuPos.right }}
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setMenuPos(null); openEditModal(menuPos.teacher); }}
              className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
              <Edit size={15} className="text-gray-400" /> Edit
            </button>
            <button onClick={() => { setMenuPos(null); handleResetPassword(menuPos.teacher); }}
              className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors">
              <KeyRound size={15} className="text-gray-400" /> Reset Password
            </button>
            <hr className="my-1 border-gray-100" />
            <button onClick={() => { setMenuPos(null); handleDelete(menuPos.teacher.id); }}
              className="w-full px-4 py-2.5 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors">
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 responsive-modal">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-primary">
                  {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingTeacher ? 'Update teacher details and assignments' : 'Create a new teacher login account'}
                </p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setFormData(EMPTY); setAssignments([]); setEditingTeacher(null); setPhotoFile(null); setPhotoPreview(null); }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Basic Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Basic Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors bg-white" placeholder="Dr. Ahsan Karim" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors bg-white" placeholder="teacher@email.com" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors bg-white" placeholder="017XXXXXXXX" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Designation <span className="text-red-400">*</span></label>
                      <input className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors bg-white" placeholder="e.g. Senior Lecturer" required value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Main Subject <span className="text-red-400">*</span></label>
                      <SubjectSelect value={formData.subject} onChange={v => setFormData({ ...formData, subject: v })} placeholder="Select subject..." required />
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Photo */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Profile Photo</h4>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 shrink-0 border-2 border-dashed border-gray-200 flex items-center justify-center">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-primary cursor-pointer transition-colors bg-white">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setPhotoFile(file);
                            setPhotoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <Upload size={16} />
                      {photoFile ? photoFile.name : 'Choose a photo...'}
                    </label>
                    {photoFile && (
                      <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(buildAssetUrl(editingTeacher?.profile_photo_path) || null); }}
                        className="text-xs text-red-500 mt-1 hover:underline">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Batch Assignments */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Batch Assignments</h4>
                <p className="text-xs text-gray-400 mb-3">A teacher can teach multiple subjects in the same batch, across multiple batches, and in multiple classes.</p>
                <div className="bg-gray-50/60 rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <select value={newBatchId} onChange={e => setNewBatchId(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none bg-white">
                        <option value="">— Select a batch —</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.course?.title || 'Course'} - {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <SubjectSelect
                        value={newBatchSubject}
                        onChange={setNewBatchSubject}
                        placeholder="Subject for this batch"
                      />
                    </div>
                    <button type="button" onClick={addAssignment}
                      className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-hover transition-colors shrink-0 flex items-center gap-1.5">
                      <Plus size={15} /> Add
                    </button>
                  </div>

                  {assignments.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {assignments.map((a, i) => (
                        <div key={i}
                          className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm hover:border-primary/30 transition-colors group">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-700 text-sm truncate">{a.batch_label}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <BookOpen size={11} /> {a.subject}
                              </p>
                            </div>
                          </div>
                          <button type="button" onClick={() => removeAssignment(i)}
                            className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {assignments.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-1">No batches assigned yet. Add one above.</p>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Additional Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Joining Date</label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="date" className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors bg-white"
                        value={formData.joining_date} onChange={e => setFormData({ ...formData, joining_date: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Bio</label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
                    <textarea className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors resize-none bg-white" rows={2}
                      placeholder="Write a short bio about the teacher..." value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Account Security</h4>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    {editingTeacher ? 'New Password' : 'Password'} <span className="text-red-400">*</span>
                    <span className="text-xs text-gray-400 font-normal ml-1">(min 8 characters)</span>
                  </label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <PasswordInput
                      className="w-full pl-9 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none transition-colors bg-white"
                      placeholder={editingTeacher ? 'Leave blank to keep current' : 'Set login password'}
                      required={!editingTeacher}
                      minLength={8}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  {editingTeacher && (
                    <p className="text-xs text-gray-400 mt-1.5">Leave blank to keep the current password unchanged.</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button"
                  onClick={() => { setIsModalOpen(false); setFormData(EMPTY); setAssignments([]); setEditingTeacher(null); setPhotoFile(null); setPhotoPreview(null); }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2">
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  ) : (
                    editingTeacher ? 'Update Teacher' : 'Add Teacher'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
