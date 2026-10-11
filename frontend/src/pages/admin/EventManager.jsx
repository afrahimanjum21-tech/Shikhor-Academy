import { useEffect, useState } from "react";
import api from "../../services/api";
import { Plus, Trash2, Calendar, Flag, BookOpen, Loader2 } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';
 
export default function EventManager() {
    const confirm = useConfirm();
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', date: '', type: 'event', description: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchEvents = async () => {
        try {
            const res = await api.get('/admin/events');
            setEvents(res.data);
        } catch (err) { logger.error(err); }
    };

    useEffect(() => { fetchEvents(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            await api.post('/admin/events', formData);
            notify.success("Event Added!");
            setIsModalOpen(false);
            setFormData({ title: '', date: '', type: 'event', description: '' });
            fetchEvents();
        } catch (error) { notify.error("Failed"); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ title: "Delete Event?", message: "Delete event?", confirmText: "Delete", variant: "destructive" }); if (ok) {
            try {
                await api.delete(`/admin/events/${id}`);
                notify.success("Event deleted");
                fetchEvents();
            } catch (err) {
                notify.error(err.response?.data?.message || "Failed to delete event");
            }
        }
    }

    const getIcon = (type) => {
        if (type === 'holiday') return <Flag size={20} className="text-red-500"/>;
        if (type === 'exam') return <BookOpen size={20} className="text-blue-500"/>;
        return <Calendar size={20} className="text-orange-500"/>;
    };

    return (
        <div className="space-y-6">
            <div className="section-header">
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-[#1F4E79]">Academic Calendar</h1>
                <p className="text-xs md:text-sm text-gray-500">Manage holidays & events</p>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="bg-[#1F4E79] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 w-full sm:w-auto"><Plus size={16} /> Add Event</button>
            </div>

            <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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

            <div className="md:hidden space-y-2 mt-2">
              {events.map(ev => (
                <div key={ev.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-full flex-shrink-0">{getIcon(ev.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{ev.title}</p>
                      {ev.description && <p className="text-xs text-gray-500 truncate">{ev.description}</p>}
                      <p className="text-xs text-gray-600 mt-1">{new Date(ev.date).toDateString()} • <span className="uppercase font-bold">{ev.type}</span></p>
                    </div>
                    <button onClick={() => handleDelete(ev.id)} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 responsive-modal">
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
                                <button type="submit" disabled={submitting} className="bg-[#1F4E79] text-white px-4 py-2 rounded hover:bg-[#163859] disabled:opacity-60 disabled:cursor-not-allowed">{submitting ? <Loader2 size={16} className="animate-spin" /> : null} {submitting ? "Saving..." : "Save"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}