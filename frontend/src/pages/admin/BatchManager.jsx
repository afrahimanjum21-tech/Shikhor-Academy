import { useEffect, useState } from "react";
import api from "../../services/api";
import { Plus, MoreVertical, Edit, Trash2, Layers, Search, Clock, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function BatchManager() {
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [formData, setFormData] = useState({ name: '', course_id: '', start_time: '', end_time: '', capacity: '' });
    const [editingId, setEditingId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        try {
            const [bRes, cRes] = await Promise.all([
                api.get('/admin/batches'),
                api.get('/public/courses')
            ]);
            setBatches(bRes.data);
            setCourses(cRes.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchData();
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        });
    }, []);

    // Time Format Helper (24h -> 12h AM/PM)
    const formatTime = (time) => {
        if (!time) return 'N/A';
        const [hour, minute] = time.split(':');
        const h = parseInt(hour, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHour = h % 12 || 12;
        return `${formattedHour}:${minute} ${ampm}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/batches/${editingId}`, formData);
                alert("Batch Updated!");
            } else {
                await api.post('/admin/batches', formData);
                alert("Batch Created!");
            }
            setIsModalOpen(false);
            setFormData({ name: '', course_id: '', start_time: '', end_time: '', capacity: '' });
            setEditingId(null);
            fetchData();
        } catch (error) { alert("Failed: " + (error.response?.data?.message || error.message)); }
    };

    const handleEdit = (batch) => {
        setFormData({
            name: batch.name,
            course_id: batch.course_id,
            start_time: batch.start_time || '',
            end_time: batch.end_time || '',
            capacity: batch.capacity || ''
        });
        setEditingId(batch.id);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDelete = async (id) => {
        if(confirm('Delete batch?')) {
            await api.delete(`/admin/batches/${id}`);
            fetchData();
        }
    };

    const filteredBatches = batches.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.course?.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79]">Batches</h1>
                    <p className="text-sm text-gray-500">Manage multiple batches for courses</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 border rounded-full focus:outline-none focus:border-[#1F4E79] text-sm" onChange={e => setSearchTerm(e.target.value)}/>
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    </div>
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setEditingId(null); setFormData({}); setIsModalOpen(true); }} 
                        className="bg-[#1F4E79] text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-[#163859] shadow-lg"
                    >
                        <Plus size={16} /> Create
                    </motion.button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                        <tr>
                            <th className="p-4">Batch Info</th>
                            <th className="p-4 hidden md:table-cell">Timing</th>
                            <th className="p-4">Capacity</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <AnimatePresence>
                        {filteredBatches.map(batch => (
                            <motion.tr 
                                key={batch.id} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="hover:bg-gray-50 transition"
                            >
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-full text-[#1F4E79]">
                                            <Layers size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800">{batch.name}</p>
                                            <p className="text-xs text-[#1F4E79] font-medium bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">{batch.course?.title}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 hidden md:table-cell">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded w-fit">
                                        <Clock size={14} className="text-orange-500"/>
                                        {formatTime(batch.start_time)} - {formatTime(batch.end_time)}
                                    </div>
                                </td>
                                <td className="p-4 text-sm font-bold text-gray-700">
                                    {batch.capacity} Students
                                </td>
                                <td className="p-4 text-right relative">
                                    <button className="action-menu-btn p-1.5 hover:bg-gray-200 rounded-full text-gray-500" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === batch.id ? null : batch.id); }}>
                                        <MoreVertical size={16} />
                                    </button>
                                    {openMenuId === batch.id && (
                                        <div className="absolute right-8 top-2 w-32 bg-white border border-gray-200 shadow-lg rounded z-10 overflow-hidden">
                                            <button onClick={() => handleEdit(batch)} className="w-full px-4 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2 text-blue-600">
                                                <Edit size={14}/> Edit
                                            </button>
                                            <button onClick={() => handleDelete(batch.id)} className="w-full px-4 py-2 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2 border-t">
                                                <Trash2 size={14}/> Delete
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </motion.tr>
                        ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl"
                    >
                        <h3 className="font-bold text-xl mb-4 text-[#1F4E79] border-b pb-2">{editingId ? 'Edit Batch' : 'Create New Batch'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Batch Name</label>
                                <input className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#1F4E79] mt-1" placeholder="e.g. Morning Batch A" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500">Select Course</label>
                                <select className="w-full border p-2 rounded text-sm bg-white mt-1" required value={formData.course_id} onChange={e => setFormData({...formData, course_id: e.target.value})}>
                                    <option value="">-- Choose Course --</option>
                                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Start Time</label>
                                    <input type="time" className="w-full border p-2 rounded text-sm mt-1" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">End Time</label>
                                    <input type="time" className="w-full border p-2 rounded text-sm mt-1" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500">Capacity</label>
                                <input type="number" className="w-full border p-2 rounded text-sm mt-1" placeholder="Max Students" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 text-sm bg-[#1F4E79] text-white rounded-lg hover:bg-[#163859] shadow-md flex items-center gap-2">
                                    <Save size={16}/> Save Batch
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}