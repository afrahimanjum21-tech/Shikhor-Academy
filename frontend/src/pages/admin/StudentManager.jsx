import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { MoreVertical, Search, Eye, Trash2, ShieldAlert, FileOutput, CheckCircle, Edit, Upload, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';
 
export default function StudentManager() {
    const confirm = useConfirm();
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]); // ব্যাচ লিস্ট
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [entries, setEntries] = useState(10);
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
        father_name: '', father_mobile: '', father_occupation: '',
        mother_name: '', mother_mobile: '', mother_occupation: '',
        present_address: '', permanent_address: '',
        emergency_name: '', emergency_mobile: '',
        last_school: '', jsc_gpa: '', ssc_gpa: '',
    });
    const [addPhoto, setAddPhoto] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        try {
            const [stdRes, batchRes] = await Promise.all([
                api.get('/admin/students'),
                api.get('/admin/batches')
            ]);
            setStudents(stdRes.data);
            setBatches(batchRes.data);
        } catch (err) { logger.error(err); } 
        finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchData();
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        });
    }, []);

    const goToDetails = (id) => navigate(`/admin/students/${id}`);

    const handleAction = async (id, action) => {
        const ok = await confirm({ title: "Confirm Action", message: `Confirm ${action}?`, confirmText: "Confirm", variant: "destructive" }); if (!ok) return;
        try { await api.post(`/admin/student/${action}/${id}`); notify.success("Success"); fetchData(); } 
        catch (err) { notify.error("Failed"); }
    };

    // এডিট মডাল ওপেন
    const openEditModal = (student) => {
        const prof = student.student_profile || {};
        setEditingStudent(student);
        setEditForm({
            name: student.name,
            email: student.email,
            phone: student.phone,
            student_id_card_no: prof.student_id_card_no || '',
            current_batch_id: prof.current_batch_id || '',
            // অন্যান্য ফিল্ড প্রয়োজন হলে যোগ করা যাবে
        });
        setIsEditOpen(true);
        setOpenMenuId(null);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/admin/student/${editingStudent.id}`, editForm);
            notify.success("Updated!");
            setIsEditOpen(false);
            fetchData();
        } catch (err) { notify.error("Failed"); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const fd = new FormData();
            Object.keys(addForm).forEach(k => fd.append(k, addForm[k] ?? ''));
            if (addPhoto) fd.append('photo', addPhoto);
            await api.post('/admin/students', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            notify.success("Student created successfully!");
            setIsAddOpen(false);
            setAddPhoto(null);
            setAddForm({ name: '', email: '', password: '', phone: '', student_id_card_no: '', current_batch_id: '', gender: '', guardian_phone: '', dob: '', religion: 'islam', blood_group: '', nationality: 'Bangladeshi', father_name: '', father_mobile: '', father_occupation: '', mother_name: '', mother_mobile: '', mother_occupation: '', present_address: '', permanent_address: '', emergency_name: '', emergency_mobile: '', last_school: '', jsc_gpa: '', ssc_gpa: '' });
            fetchData();
        } catch (err) {
            const errors = err.response?.data?.errors;
            const msg = errors ? Object.values(errors).flat().join('\n') : (err.response?.data?.message || 'Failed to create student');
            notify.error(msg);
        } finally { setSaving(false); }
    };

    const filteredStudents = students.filter(std => 
        std.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

            <div className="overflow-x-auto min-h-[400px] hidden md:block">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                        <tr><th className="p-3">Name</th><th className="p-3 hidden md:table-cell">ID</th><th className="p-3 hidden sm:table-cell">Batch</th><th className="p-3 text-right">Action</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredStudents.slice(0, entries).map(std => (
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
                                            <button onClick={(e) => {e.stopPropagation(); handleAction(std.id, 'ban')}} className="w-full px-4 py-2 hover:bg-gray-50 text-orange-600 flex items-center gap-2"><ShieldAlert size={14}/> Ban</button>
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
                {filteredStudents.slice(0, entries).map(std => (
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
                                <button onClick={(e) => {e.stopPropagation(); handleAction(std.id, 'delete')}} className="flex-1 py-1 text-[11px] bg-red-50 text-red-600 rounded hover:bg-red-100">Delete</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

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
                                        <input type="password" autoComplete="new-password" minLength={8} className="w-full border p-2 rounded text-sm" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} />
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
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.father_mobile} onChange={e => setAddForm({...addForm, father_mobile: e.target.value})} />
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
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.mother_mobile} onChange={e => setAddForm({...addForm, mother_mobile: e.target.value})} />
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
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.emergency_name} onChange={e => setAddForm({...addForm, emergency_name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Emergency Contact Mobile</label>
                                        <input className="w-full border p-2 rounded text-sm" value={addForm.emergency_mobile} onChange={e => setAddForm({...addForm, emergency_mobile: e.target.value})} />
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
                            <input className="w-full border p-2 rounded text-sm" value={editForm.student_id_card_no} onChange={e => setEditForm({...editForm, student_id_card_no: e.target.value})} placeholder="ID No"/>
                            <select className="w-full border p-2 rounded text-sm bg-white" value={editForm.current_batch_id} onChange={e => setEditForm({...editForm, current_batch_id: e.target.value})}>
                                <option value="">Select Batch</option>
                                {batches.map(b => <option key={b.id} value={b.id}>{b.course?.title} - {b.name}</option>)}
                            </select>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-sm font-bold">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-[#1F4E79] text-white rounded text-sm font-bold">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
