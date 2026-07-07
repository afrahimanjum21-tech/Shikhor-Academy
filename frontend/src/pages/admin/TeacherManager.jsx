import { useEffect, useState } from "react";
import api from "../../services/api";
import { Plus, MoreVertical, Trash2, Search, User } from "lucide-react";

export default function TeacherManager() {
    const [teachers, setTeachers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', designation: '', subject: '' });
    const [openMenuId, setOpenMenuId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchTeachers = async () => {
        try {
            const res = await api.get('/public/teachers');
            setTeachers(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchTeachers();
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/teachers', formData);
            alert("Added!");
            setIsModalOpen(false);
            setFormData({ name: '', email: '', phone: '', designation: '', subject: '' });
            fetchTeachers();
        } catch (error) { alert(error.response?.data?.message || "Failed"); }
    };

    const handleDelete = async (id) => {
        if(confirm('Delete teacher?')) {
            await api.delete(`/admin/teachers/${id}`);
            fetchTeachers();
        }
    };

    const filteredTeachers = teachers.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79]">Faculty</h1>
                    <p className="text-sm text-gray-500">Manage teachers & staff</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 border rounded-md focus:border-[#1F4E79] outline-none text-sm" onChange={e => setSearchTerm(e.target.value)}/>
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-[#1F4E79] text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-[#163859]">
                        <Plus size={16} /> Add
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-4">Name & Email</th>
                                <th className="p-4 hidden md:table-cell">Designation</th>
                                <th className="p-4 hidden md:table-cell">Subject</th>
                                <th className="p-4">Phone</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTeachers.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <p className="font-bold text-gray-800">{t.name}</p>
                                        <p className="text-xs text-gray-500">{t.email}</p>
                                        <p className="text-xs text-[#1F4E79] md:hidden mt-1">{t.teacher_profile?.designation}</p>
                                    </td>
                                    <td className="p-4 hidden md:table-cell text-sm text-gray-600">{t.teacher_profile?.designation}</td>
                                    <td className="p-4 hidden md:table-cell text-sm text-gray-600">{t.teacher_profile?.subject}</td>
                                    <td className="p-4 text-sm text-gray-600">{t.phone}</td>
                                    <td className="p-4 text-right relative">
                                        <button className="action-menu-btn p-1.5 hover:bg-gray-200 rounded-full text-gray-500" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === t.id ? null : t.id); }}>
                                            <MoreVertical size={16} />
                                        </button>
                                        {openMenuId === t.id && (
                                            <div className="absolute right-8 top-2 w-32 bg-white border border-gray-200 shadow-lg rounded z-10">
                                                <button onClick={() => handleDelete(t.id)} className="w-full px-4 py-2 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                    <Trash2 size={14}/> Delete
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h3 className="font-bold text-lg mb-4 text-[#1F4E79] border-b pb-2">Add Teacher</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Full Name" required onChange={e => setFormData({...formData, name: e.target.value})} />
                            <input className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Email" type="email" required onChange={e => setFormData({...formData, email: e.target.value})} />
                            <input className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Phone" required onChange={e => setFormData({...formData, phone: e.target.value})} />
                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Designation" required onChange={e => setFormData({...formData, designation: e.target.value})} />
                                <input className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Subject" required onChange={e => setFormData({...formData, subject: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-[#1F4E79] text-white rounded hover:opacity-90">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}