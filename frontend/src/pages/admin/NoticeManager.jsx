import { useEffect, useState } from "react";
import api from "../../services/api";
import { Plus, MoreVertical, Trash2, Bell, Calendar } from "lucide-react";

export default function NoticeManager() {
    const [notices, setNotices] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', description: '', type: 'general', date: '' });
    const [openMenuId, setOpenMenuId] = useState(null);

    const fetchNotices = async () => {
        try {
            const res = await api.get('/public/notices');
            setNotices(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchNotices();
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/notices', formData);
            alert("Posted!");
            setIsModalOpen(false);
            setFormData({ title: '', description: '', type: 'general', date: '' });
            fetchNotices();
        } catch (error) { alert("Failed"); }
    };

    const handleDelete = async (id) => {
        if(confirm("Delete notice?")) {
            await api.delete(`/admin/notices/${id}`);
            fetchNotices();
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79]">Notice Board</h1>
                    <p className="text-sm text-gray-500">Announcements & Updates</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-[#1F4E79] text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-[#163859]">
                    <Plus size={16} /> Post
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                        <tr>
                            <th className="p-4">Title</th>
                            <th className="p-4 hidden md:table-cell">Type</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {notices.map(notice => (
                            <tr key={notice.id} className="hover:bg-gray-50 transition">
                                <td className="p-4">
                                    <p className="font-bold text-gray-800 text-sm">{notice.title}</p>
                                    <p className="text-xs text-gray-500 line-clamp-1 mt-1">{notice.description}</p>
                                </td>
                                <td className="p-4 hidden md:table-cell">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        notice.type === 'holiday' ? 'bg-green-100 text-green-700' :
                                        notice.type === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {notice.type}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-gray-600 flex items-center gap-2">
                                    <Calendar size={14} className="text-gray-400"/> {notice.date}
                                </td>
                                <td className="p-4 text-right relative">
                                    <button className="action-menu-btn p-1.5 hover:bg-gray-200 rounded-full text-gray-500" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === notice.id ? null : notice.id); }}>
                                        <MoreVertical size={16} />
                                    </button>
                                    {openMenuId === notice.id && (
                                        <div className="absolute right-8 top-2 w-32 bg-white border border-gray-200 shadow-lg rounded z-10">
                                            <button onClick={() => handleDelete(notice.id)} className="w-full px-4 py-2 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2">
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h3 className="font-bold text-lg mb-4 text-[#1F4E79] border-b pb-2">Post Notice</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Title" required onChange={e => setFormData({...formData, title: e.target.value})} />
                            <textarea className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Description" rows="3" required onChange={e => setFormData({...formData, description: e.target.value})} />
                            <div className="grid grid-cols-2 gap-3">
                                <select className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none bg-white" onChange={e => setFormData({...formData, type: e.target.value})}>
                                    <option value="general">General</option>
                                    <option value="exam">Exam</option>
                                    <option value="holiday">Holiday</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                                <input type="date" className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" required onChange={e => setFormData({...formData, date: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-[#1F4E79] text-white rounded hover:opacity-90">Post</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}