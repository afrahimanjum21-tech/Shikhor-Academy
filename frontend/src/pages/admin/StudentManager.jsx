import { useEffect, useState } from "react";
import api from "../../services/api";
import { MoreVertical, Search, Eye, Trash2, ShieldAlert, FileOutput, CheckCircle, Edit, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function StudentManager() {
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

    const fetchData = async () => {
        try {
            const [stdRes, batchRes] = await Promise.all([
                api.get('/admin/students'),
                api.get('/admin/batches')
            ]);
            setStudents(stdRes.data);
            setBatches(batchRes.data);
        } catch (err) { console.error(err); } 
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
        if(!confirm(`Confirm ${action}?`)) return;
        try { await api.post(`/admin/student/${action}/${id}`); alert("Success"); fetchData(); } 
        catch (err) { alert("Failed"); }
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
            alert("Updated!");
            setIsEditOpen(false);
            fetchData();
        } catch (err) { alert("Failed"); }
    };

    const filteredStudents = students.filter(std => 
        std.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ইমেজ ইউআরএল জেনারেটর
    const getPhotoUrl = (student) => {
        const path = student.profile_photo_url || student.profile_photo_path || student.student_profile?.admission?.photo_path;
        return path?.startsWith('http') ? path : (path ? `http://localhost:8000/${path}` : null);
    };

    return (
        <div className="bg-white p-6 rounded shadow border border-gray-200">
            <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                <h1 className="text-xl font-bold text-[#1F4E79]">All Students</h1>
                <input placeholder="Search..." className="border p-2 rounded text-sm w-full md:w-64 focus:border-[#1F4E79] outline-none" onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="overflow-x-auto min-h-[400px]">
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

            {/* Quick Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={(e) => e.stopPropagation()}>
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
