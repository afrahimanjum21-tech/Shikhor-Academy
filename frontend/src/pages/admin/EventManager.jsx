import { useEffect, useState } from "react";
import api from "../../services/api";
import { Plus, Trash2, Calendar, Flag, BookOpen } from "lucide-react";

export default function EventManager() {
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', date: '', type: 'event', description: '' });

    const fetchEvents = async () => {
        try {
            const res = await api.get('/admin/events');
            setEvents(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchEvents(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/events', formData);
            alert("Event Added!");
            setIsModalOpen(false);
            setFormData({ title: '', date: '', type: 'event', description: '' });
            fetchEvents();
        } catch (error) { alert("Failed"); }
    };

    const handleDelete = async (id) => {
        if(confirm("Delete event?")) {
            await api.delete(`/admin/events/${id}`);
            fetchEvents();
        }
    }

    const getIcon = (type) => {
        if (type === 'holiday') return <Flag size={20} className="text-red-500"/>;
        if (type === 'exam') return <BookOpen size={20} className="text-blue-500"/>;
        return <Calendar size={20} className="text-orange-500"/>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79]">Academic Calendar</h1>
                    <p className="text-sm text-gray-500">Manage holidays & events</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-[#1F4E79] text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2">
                    <Plus size={16} /> Add Event
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold border-b">
                        <tr>
                            <th className="p-4">Event Name</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {events.map(ev => (
                            <tr key={ev.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800 flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 rounded-full">{getIcon(ev.type)}</div>
                                    <div>
                                        <p>{ev.title}</p>
                                        <p className="text-xs text-gray-500 font-normal">{ev.description}</p>
                                    </div>
                                </td>
                                <td className="p-4 uppercase text-xs font-bold text-gray-500">{ev.type}</td>
                                <td className="p-4 text-gray-700 font-mono">{new Date(ev.date).toDateString()}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleDelete(ev.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h3 className="font-bold text-lg mb-4 text-[#1F4E79] border-b pb-2">Add Event</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#1F4E79]" placeholder="Event Title" required onChange={e => setFormData({...formData, title: e.target.value})} />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="date" className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#1F4E79]" required onChange={e => setFormData({...formData, date: e.target.value})} />
                                <select className="w-full border p-2 rounded text-sm bg-white focus:outline-none focus:border-[#1F4E79]" onChange={e => setFormData({...formData, type: e.target.value})}>
                                    <option value="event">Event</option>
                                    <option value="holiday">Holiday</option>
                                    <option value="exam">Exam</option>
                                </select>
                            </div>
                            <textarea className="w-full border p-2 rounded text-sm focus:outline-none focus:border-[#1F4E79]" placeholder="Description (Optional)" rows="2" onChange={e => setFormData({...formData, description: e.target.value})} />
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 px-4 py-2 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="bg-[#1F4E79] text-white px-4 py-2 rounded hover:bg-[#163859]">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}