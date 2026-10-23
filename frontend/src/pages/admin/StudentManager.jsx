import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { MoreVertical, Search, Eye, Trash2, ShieldAlert, FileOutput, CheckCircle, Edit, Upload, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import PasswordInput from "../../components/common/PasswordInput";
import logger from '../../services/logger';
 
export default function StudentManager() {
    const confirm = useConfirm();
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]); // ব্যাচ লিস্ট
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [openMenuId, setOpenMenuId] = useState(null);
    const navigate = useNavigate();

    // এডিট মডাল স্টেট
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editForm, setEditForm] = useState({});

    // অ্যাড স্টুডেন্ট মডাল
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addForm, setAddForm] = useState({
        name: '', email: '', password: '', phone: '',
        student_id_card_no: '', current_batch_id: '',
        gender: '', guardian_phone: '',
        dob: '', religion: 'islam', blood_group: '', nationality: 'Bangladeshi',
        father_name: '', father_phone: '', father_occupation: '',
        mother_name: '', mother_phone: '', mother_occupation: '',
         present_address: '', permanent_address: '',
        emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
        last_school: '', jsc_gpa: '', ssc_gpa: '', subject: '',
    });
    const [addPhoto, setAddPhoto] = useState(null);
    const [saving, setSaving] = useState(false);
    // C18: a one-time generated credential to show the admin after creating a
    // student without a manual password (shown once, not persisted/logged).
    const [newCredential, setNewCredential] = useState(null);

    const fetchData = async (pageNo = page, query = searchTerm) => {
        try {
            setLoading(true);
            const [stdRes, batchRes, subRes] = await Promise.all([
                api.get('/admin/students', { params: { page: pageNo, limit: perPage, search: query || undefined } }),
                api.get('/admin/batches'),
                api.get('/admin/faculty/subjects')
            ]);
            setStudents(stdRes.data);
            setTotal(stdRes.data.total || stdRes.data.length || 0);
            setLastPage(stdRes.data.last_page || 1);
            setBatches(batchRes.data);
            setSubjects(subRes.data || []);
        } catch (err) { logger.error(err); } 
        finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchData();
        const onDocClick = (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);

    // Debounced search against the server-side search param.
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            fetchData(1, searchTerm);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const goToPage = (nextPage) => {
        if (nextPage < 1 || nextPage > lastPage) return;
        setPage(nextPage);
        fetchData(nextPage, searchTerm);
    };

    const goToDetails = (id) => navigate(`/admin/students/${id}`);

    const handleAction = async (id, action) => {
        const ok = await confirm({ title: "Confirm Action", message: `Confirm ${action}?`, confirmText: "Confirm", variant: "destructive" }); if (!ok) return;
        try {
            await api.post(`/admin/student/${action}/${id}`);
            notify.success("Success");
            if (action === 'delete') {
                setStudents((current) => current.filter((student) => student.id !== id));
                setTotal((current) => Math.max(0, current - 1));
            }
            await fetchData();
        }
        catch (err) { notify.error(err.response?.data?.message || "Failed"); }
    };

    // এডিট মডাল ওপেন
    const openEditModal = (student) => {
        const prof = student.student_profile || {};
        setEditingStudent(student);
        setEditForm({
            name: student.name,
            email: student.email,
            phone: student.phone,
            guardian_phone: prof.guardian_phone || '',
            student_id_card_no: prof.student_id_card_no || '',
            current_batch_id: prof.current_batch_id || '',
            subject: prof.subject || '',
            emergency_contact_name: prof.emergency_contact_name || prof.emergency_name || '',
            emergency_contact_phone: prof.emergency_contact_phone || prof.emergency_mobile || '',
            emergency_contact_relation: prof.emergency_contact_relation || '',
        });
        setIsEditOpen(true);
        setOpenMenuId(null);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/admin/student/${editingStudent.id}`, editForm);
            notify.success("Updated!");
            setIsEditOpen(false);
            fetchData();
        } catch (err) { notify.error("Failed"); }
        finally { setSaving(false); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const fd = new FormData();
            Object.keys(addForm).forEach(k => fd.append(k, addForm[k] ?? ''));
            if (addPhoto) fd.append('photo', addPhoto);
            const res = await api.post('/admin/students', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            // C18: if the backend generated a password (none supplied), surface
            // it ONCE so the admin can hand it over — otherwise the account is
            // unusable. If the admin typed a password, they already know it.
            const tempPw = res?.data?.data?.user?.temp_password;
            const createdEmail = addForm.email;
            notify.success("Student created successfully!");
            setIsAddOpen(false);
            setAddPhoto(null);
            if (tempPw) setNewCredential({ email: createdEmail || '(no email set)', password: tempPw });
            setAddForm({ name: '', email: '', password: '', phone: '', student_id_card_no: '', current_batch_id: '', gender: '', guardian_phone: '', dob: '', religion: 'islam', blood_group: '', nationality: 'Bangladeshi', father_name: '', father_phone: '', father_occupation: '', mother_name: '', mother_phone: '', mother_occupation: '', present_address: '', permanent_address: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '', last_school: '', jsc_gpa: '', ssc_gpa: '', subject: '' });
            fetchData();
        } catch (err) {
            const errors = err.response?.data?.errors;
            const msg = errors ? Object.values(errors).flat().join('\n') : (err.response?.data?.message || 'Failed to create student');
            notify.error(msg);
        } finally { setSaving(false); }
    };

    // C17: the server already searches name/email/phone/ID across the WHOLE
    // dataset (see fetchData's `search` param), so there is NO client-side
    // name-only re-filter here — that previously hid email/phone/ID matches
    // returned by the server. Render the server page as-is.

    // ইমেজ ইউআরএল জেনারেটর
    const getPhotoUrl = (student) => {
        const path = student.profile_photo_url || student.profile_photo_path || student.student_profile?.admission?.photo_path;
        return buildAssetUrl(path);
    };

    return (
        <div className="mobile-card">
            <div className="section-header">
                <h1 className="text-lg md:text-xl font-bold text-[#1F4E79]">All Students</h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <input placeholder="Search students..." className="w-full border p-2 rounded-lg text-sm focus:border-[#1F4E79] outline-none pl-8" onChange={e => setSearchTerm(e.target.value)} />
                        <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
                    </div>
                    <button onClick={() => setIsAddOpen(true)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#163859] transition text-sm font-bold w-full sm:w-auto">
                        <Plus size={16} /> Add Student
                    </button>
                </div>
            </div>

            {newCredential && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-start justify-between gap-3">
                    <div>
                        <p className="font-bold">Student account created — save this one-time login:</p>
                        <p className="mt-1">Email: <span className="font-mono font-semibold">{newCredential.email}</span></p>
                        <p>Temporary password: <span className="font-mono font-semibold">{newCredential.password}</span></p>
                        <p className="mt-1 text-xs text-green-700">This password is shown only once. Share it securely with the student; they can change it after logging in.</p>
                    </div>
                    <button onClick={() => setNewCredential(null)} className="text-green-700 hover:text-green-900 shrink-0" aria-label="Dismiss">
                        <X size={18} />
                    </button>
                </div>
            )}

            <div className="overflow-x-auto min-h-[400px] hidden md:block">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                        <tr><th className="p-3">Name</th><th className="p-3 hidden md:table-cell">ID</th><th className="p-3 hidden sm:table-cell">Batch</th><th className="p-3 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {students.map(std => (
                            <tr key={std.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => goToDetails(std.id)}>
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0">
                                            {getPhotoUrl(std) ? (
                                                <img 
                                                    src={getPhotoUrl(std)} 
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                                                />
                                            ) : null}
                                            <div className={`w-full h-full flex items-center justify-center font-bold text-[#1F4E79] bg-gray-100 ${getPhotoUrl(std) ? 'hidden' : 'flex'}`}>
                                                {std.name.charAt(0)}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="font-bold text-[#1F4E79]">{std.name}</p>
                                            <p className="text-xs text-gray-500 md:hidden">ID: {std.student_profile?.student_id_card_no || 'N/A'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3 font-mono hidden md:table-cell">{std.student_profile?.student_id_card_no || 'N/A'}</td>
                                <td className="p-3 hidden sm:table-cell">
                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-100">
                                        {std.student_profile?.batch?.name || 'No Batch'}
                                    </span>
                                </td>
                                <td className="p-3 text-right relative">
                                    <button className="action-menu-btn p-1.5 hover:bg-gray-200 rounded-full" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === std.id ? null : std.id); }}>
                                        <MoreVertical size={16}/>
                                    </button>
                                    {openMenuId === std.id && (
                                        <div className="absolute right-8 top-0 bg-white shadow-lg border rounded z-50 w-36 text-left">
                                            <button onClick={(e) => {e.stopPropagation(); goToDetails(std.id)}} className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-2"><Eye size={14}/> View</button>
                                            <button onClick={(e) => {e.stopPropagation(); openEditModal(std)}} className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-blue-600"><Edit size={14}/> Edit</button>
                                            {std.is_active ? (
                                                <button onClick={(e) => {e.stopPropagation(); handleAction(std.id, 'ban')}} className="w-full px-4 py-2 hover:bg-gray-50 text-orange-600 flex items-center gap-2"><ShieldAlert size={14}/> Ban</button>
                                            ) : (
                                                <button onClick={(e) => {e.stopPropagation(); handleAction(std.id, 'activate')}} className="w-full px-4 py-2 hover:bg-gray-50 text-green-600 flex items-center gap-2"><CheckCircle size={14}/> Activate</button>
                                            )}
                                            <button onClick={(e) => {e.stopPropagation(); handleAction(std.id, 'delete')}} className="w-full px-4 py-2 hover:bg-gray-50 text-red-600 flex items-center gap-2 border-t"><Trash2 size={14}/> Delete</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="md:hidden space-y-1 mt-2">
                {students.map(std => (
                    <div key={std.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2" onClick={() => goToDetails(std.id)}>
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0">
                                {getPhotoUrl(std) ? (
                                    <img src={getPhotoUrl(std)} className="w-full h-full object-cover"
                                        onError={(e) => { e.target.style.display='none'; if(e.target.nextSibling) e.target.nextSibling.style.display='flex'; }} />
                                ) : null}
                                <div className={`w-full h-full flex items-center justify-center font-bold text-[10px] text-[#1F4E79] bg-gray-100 ${getPhotoUrl(std) ? 'hidden' : 'flex'}`}>
                                    {std.name.charAt(0)}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="font-semibold text-gray-800 text-[13px] truncate">{std.name}</p>
                                    <span className="text-[10px] text-gray-400 shrink-0">{std.student_profile?.student_id_card_no || ''}</span>
                                </div>
                                <span className="text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{std.student_profile?.batch?.name || 'No Batch'}</span>
                            </div>
                            <button className="p-1 hover:bg-gray-100 rounded-full shrink-0" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === std.id ? null : std.id); }}>
                                <MoreVertical size={14} />
                            </button>
                        </div>
                        {openMenuId === std.id && (
                            <div className="flex gap-1 mt-1.5 pt-1.5 border-t border-gray-100">
                                <button onClick={(e) => {e.stopPropagation(); goToDetails(std.id)}} className="flex-1 py-1 text-[11px] bg-gray-100 rounded hover:bg-gray-200">View</button>
                                <button onClick={(e) => {e.stopPropagation(); openEditModal(std)}} className="flex-1 py-1 text-[11px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Edit</button>
                                {std.is_active ? (
                                    <button onClick={(e) => {e.stopPropagation(); handleAction(std.id, 'ban')}} className="flex-1 py-1 text-[11px] bg-orange-50 text-orange-600 rounded hover:bg-orange-100">Ban</button>
                                ) : (
                                    <button onClick={(e) => {e.stopPropagation(); handleAction(std.id, 'activate')}} className="flex-1 py-1 text-[11px] bg-green-50 text-green-600 rounded hover:bg-green-100">Activate</button>
                                )}
                                <button onClick={(e) => {e.stopPropagation(); handleAction(std.id, 'delete')}} className="flex-1 py-1 text-[11px] bg-red-50 text-red-600 rounded hover:bg-red-100">Delete</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {!loading && students.length === 0 && (
                <div className="py-16 text-center text-gray-500">
                    <Search className="mx-auto mb-3 text-gray-300" size={40} />
                    <p className="text-sm font-semibold">{searchTerm ? "No students match your search" : "No students found yet"}</p>
                    <button onClick={() => setIsAddOpen(true)} className="mt-4 px-4 py-2 bg-[#1F4E79] text-white rounded-lg text-sm font-bold hover:bg-[#163859]">
                        Add the first student
                    </button>
                </div>
            )}

            {total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                        Showing {loading ? 0 : (page - 1) * perPage + 1}-{Math.min(page * perPage, total)} of {total} students
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => goToPage(page - 1)}
                            disabled={page <= 1 || loading}
                            className="px-3 py-1.5 rounded border text-xs font-bold text-[#1F4E79] hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >&laquo; Prev</button>
                        <span className="px-3 py-1.5 text-xs font-semibold text-gray-600">Page {page} of {lastPage}</span>
                        <button
                            onClick={() => goToPage(page + 1)}
                            disabled={page >= lastPage || loading}
                            className="px-3 py-1.5 rounded border text-xs font-bold text-[#1F4E79] hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >Next &raquo;</button>
                    </div>
                </div>
            )}

            {/* Add Student Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 responsive-modal" onClick={(e) => { if (e.target === e.currentTarget) setIsAddOpen(false); }}>
                    <div className="bg-white p-6 rounded-lg w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-[#1F4E79]">Add New Student</h3>
                            <button onClick={() => setIsAddOpen(false)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAdd} className="space-y-5">
                            {/* Photo Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
                                <input type="file" accept="image/jpg,image/jpeg,image/png,image/webp" onChange={e => setAddPhoto(e.target.files[0])} className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#1F4E79] file:text-white hover:file:bg-[#1a3d66]" />
                                {addPhoto && <p className="text-xs text-green-600 mt-1">Selected: {addPhoto.name}</p>}
                            </div>

                            {/* Student Information */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-700 border-b pb-1">Student Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                                        <input required className="w-full border p-2 rounded text-sm" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                                        <input type="email" autoComplete="off" className="w-full border p-2 rounded text-sm" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                                        <PasswordInput autoComplete="new-password" minLength={8} className="w-full border p-2 rounded text-sm" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
                                        <input type="date" className="w-full border p-2 rounded text-sm" value={addForm.dob} onChange={e => setAddForm({...addForm, dob: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Student ID Card No</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.student_id_card_no} onChange={e => setAddForm({...addForm, student_id_card_no: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Batch</label>
                                        <select className="w-full border p-2 rounded text-sm bg-white" value={addForm.current_batch_id} onChange={e => setAddForm({...addForm, current_batch_id: e.target.value})}>
                                            <option value="">Select Batch</option>
                                            {batches.map(b => <option key={b.id} value={b.id}>{b.course?.title} - {b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                                        <select className="w-full border p-2 rounded text-sm bg-white" value={addForm.subject} onChange={e => setAddForm({...addForm, subject: e.target.value})}>
                                            <option value="">Select Subject</option>
                                            <option value="All">All</option>
                                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Details */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-700 border-b pb-1">Personal Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Gender *</label>
                                        <select className="w-full border p-2 rounded text-sm bg-white" value={addForm.gender} onChange={e => setAddForm({...addForm, gender: e.target.value})}>
                                            <option value="">Select</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Religion</label>
                                        <select className="w-full border p-2 rounded text-sm bg-white" value={addForm.religion} onChange={e => setAddForm({...addForm, religion: e.target.value})}>
                                            <option value="islam">Islam</option>
                                            <option value="hindu">Hindu</option>
                                            <option value="christian">Christian</option>
                                            <option value="buddhist">Buddhist</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Blood Group</label>
                                        <select className="w-full border p-2 rounded text-sm bg-white" value={addForm.blood_group} onChange={e => setAddForm({...addForm, blood_group: e.target.value})}>
                                            <option value="">Select</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Nationality</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.nationality} onChange={e => setAddForm({...addForm, nationality: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Guardian Phone</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.guardian_phone} onChange={e => setAddForm({...addForm, guardian_phone: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* Guardian Information */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-700 border-b pb-1">Guardian Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Father's Name *</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.father_name} onChange={e => setAddForm({...addForm, father_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Father's Mobile *</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.father_phone} onChange={e => setAddForm({...addForm, father_phone: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Father's Occupation</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.father_occupation} onChange={e => setAddForm({...addForm, father_occupation: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Mother's Name *</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.mother_name} onChange={e => setAddForm({...addForm, mother_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Mother's Mobile</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.mother_phone} onChange={e => setAddForm({...addForm, mother_phone: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Mother's Occupation</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.mother_occupation} onChange={e => setAddForm({...addForm, mother_occupation: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-700 border-b pb-1">Address</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Present Address *</label>
                                        <textarea rows={2} className="w-full border p-2 rounded text-sm" value={addForm.present_address} onChange={e => setAddForm({...addForm, present_address: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Permanent Address</label>
                                        <textarea rows={2} className="w-full border p-2 rounded text-sm" value={addForm.permanent_address} onChange={e => setAddForm({...addForm, permanent_address: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-700 border-b pb-1">Emergency Contact</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact Name</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.emergency_contact_name || ''} onChange={e => setAddForm({...addForm, emergency_contact_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact Phone</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.emergency_contact_phone || ''} onChange={e => setAddForm({...addForm, emergency_contact_phone: e.target.value})} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact Relation</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.emergency_contact_relation || ''} onChange={e => setAddForm({...addForm, emergency_contact_relation: e.target.value})} placeholder="e.g. Father, Mother, Guardian" />
                                    </div>
                                </div>
                            </div>

                            {/* Academic History */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-700 border-b pb-1">Academic History</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Last School</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.last_school} onChange={e => setAddForm({...addForm, last_school: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">JSC GPA</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.jsc_gpa} onChange={e => setAddForm({...addForm, jsc_gpa: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">SSC GPA</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.ssc_gpa} onChange={e => setAddForm({...addForm, ssc_gpa: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => { setIsAddOpen(false); setAddPhoto(null); }} className="px-4 py-2 bg-gray-200 rounded text-sm font-bold">Cancel</button>
                                <button type="submit" disabled={saving} className="px-4 py-2 bg-[#1F4E79] text-white rounded text-sm font-bold disabled:opacity-60">{saving ? 'Creating...' : 'Create Student'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 responsive-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h3 className="font-bold text-lg mb-4 text-[#1F4E79]">Quick Edit</h3>
            <form onSubmit={handleUpdate} className="space-y-3">
                <input className="w-full border p-2 rounded text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name"/>
                <input className="w-full border p-2 rounded text-sm" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="Email"/>
                <input className="w-full border p-2 rounded text-sm" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="Phone"/>
                <input className="w-full border p-2 rounded text-sm" value={editForm.guardian_phone || ''} onChange={e => setEditForm({...editForm, guardian_phone: e.target.value})} placeholder="Guardian Phone (WhatsApp)"/>
                <input className="w-full border p-2 rounded text-sm" value={editForm.student_id_card_no} onChange={e => setEditForm({...editForm, student_id_card_no: e.target.value})} placeholder="ID No"/>
                <select className="w-full border p-2 rounded text-sm bg-white" value={editForm.current_batch_id} onChange={e => setEditForm({...editForm, current_batch_id: e.target.value})}>
                    <option value="">Select Batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.course?.title} - {b.name}</option>)}
                </select>
                <select className="w-full border p-2 rounded text-sm bg-white" value={editForm.subject || ''} onChange={e => setEditForm({...editForm, subject: e.target.value})}>
                    <option value="">Select Subject</option>
                    <option value="All">All</option>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <hr className="my-2" />
                <p className="text-xs font-semibold text-gray-500">Emergency Contact</p>
                <input className="w-full border p-2 rounded text-sm" value={editForm.emergency_contact_name || ''} onChange={e => setEditForm({...editForm, emergency_contact_name: e.target.value})} placeholder="Emergency Contact Name"/>
                <input className="w-full border p-2 rounded text-sm" value={editForm.emergency_contact_phone || ''} onChange={e => setEditForm({...editForm, emergency_contact_phone: e.target.value})} placeholder="Emergency Contact Phone"/>
                <input className="w-full border p-2 rounded text-sm" value={editForm.emergency_contact_relation || ''} onChange={e => setEditForm({...editForm, emergency_contact_relation: e.target.value})} placeholder="Relation (e.g. Father)"/>
                <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-sm font-bold">Cancel</button>
                    <button type="submit" disabled={saving} className="px-4 py-2 bg-[#1F4E79] text-white rounded text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed">
                        {saving ? (
                            <>
                                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.175 5.824 3 7.938l3-2.707z" />
                                </svg>
                                Saving...
                            </>
                        ) : 'Update'}
                    </button>
                </div>
            </form>
                    </div>
                </div>
            )}
        </div>
    );
}
