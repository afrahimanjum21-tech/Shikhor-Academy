import { useEffect, useState } from "react";
import api from "../../services/api";
import { Plus, Trash2 } from "lucide-react";

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function RoutineManager() {
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    
    // সিলেকশন
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedBatch, setSelectedBatch] = useState("");
    
    const [routine, setRoutine] = useState({});
    
    // ফর্ম
    const [formData, setFormData] = useState({
        day: 'Saturday', subject: '', teacher_name: '', start_time: '', end_time: '', room_no: ''
    });

    // ১. সব কোর্স আনা
    useEffect(() => {
        api.get('/public/courses').then(res => setCourses(res.data));
    }, []);

    // ২. কোর্স সিলেক্ট করলে সেই কোর্সের ব্যাচগুলো আনা
    useEffect(() => {
        if (selectedCourse) {
            // আমরা সব ব্যাচ এনে ফিল্টার করছি (অথবা ব্যাকএন্ড ফিল্টার করা ভালো)
            api.get('/admin/batches').then(res => {
                const courseBatches = res.data.filter(b => b.course_id == selectedCourse);
                setBatches(courseBatches);
                setSelectedBatch(""); // রিসেট
            });
        } else {
            setBatches([]);
        }
    }, [selectedCourse]);

    // ৩. ব্যাচ সিলেক্ট করলে রুটিন আনা
    useEffect(() => {
        if (selectedBatch) {
            api.get(`/admin/routines?batch_id=${selectedBatch}`).then(res => setRoutine(res.data));
        } else {
            setRoutine({});
        }
    }, [selectedBatch]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!selectedBatch) return alert("Select a batch first!");

        try {
            await api.post('/admin/routines', { ...formData, batch_id: selectedBatch });
            alert("Class Added!");
            const res = await api.get(`/admin/routines?batch_id=${selectedBatch}`);
            setRoutine(res.data);
            setFormData({ ...formData, subject: '', teacher_name: '', start_time: '', end_time: '', room_no: '' });
        } catch (err) { alert("Failed to add"); }
    };

    const handleDelete = async (id) => {
        if(!confirm("Delete class?")) return;
        await api.delete(`/admin/routines/${id}`);
        const res = await api.get(`/admin/routines?batch_id=${selectedBatch}`);
        setRoutine(res.data);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-[#1F4E79]">Routine Management</h1>

            {/* Selection Area */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">1. Select Course</label>
                    <select 
                        className="w-full border p-2 rounded focus:border-[#1F4E79] outline-none"
                        onChange={(e) => setSelectedCourse(e.target.value)}
                    >
                        <option value="">-- Choose Course --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">2. Select Batch</label>
                    <select 
                        className="w-full border p-2 rounded focus:border-[#1F4E79] outline-none"
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        disabled={!selectedCourse}
                    >
                        <option value="">-- Choose Batch --</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
            </div>

            {selectedBatch && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add Class Form */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
                        <h3 className="font-bold text-lg mb-4 text-[#1F4E79] border-b pb-2">Add New Class</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500">Day</label>
                                <select className="w-full border p-2 rounded text-sm" value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})}>
                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">Subject</label>
                                <input className="w-full border p-2 rounded text-sm" placeholder="e.g. Physics" required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Start</label>
                                    <input className="w-full border p-2 rounded text-sm" type="time" required value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">End</label>
                                    <input className="w-full border p-2 rounded text-sm" type="time" required value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">Teacher</label>
                                <input className="w-full border p-2 rounded text-sm" placeholder="Name" value={formData.teacher_name} onChange={e => setFormData({...formData, teacher_name: e.target.value})} />
                            </div>
                            <button type="submit" className="w-full bg-[#1F4E79] text-white py-2 rounded font-bold hover:bg-[#163859] flex items-center justify-center gap-2 mt-2">
                                <Plus size={16} /> Add Class
                            </button>
                        </form>
                    </div>

                    {/* Routine View */}
                    <div className="lg:col-span-2 space-y-4">
                        {DAYS.map(day => (
                            <div key={day} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 font-bold text-gray-700 border-b flex justify-between items-center">
                                    <span>{day}</span>
                                    <span className="text-[10px] bg-white border px-2 py-0.5 rounded text-gray-500">{routine[day]?.length || 0} Classes</span>
                                </div>
                                <div className="p-2 space-y-2">
                                    {routine[day]?.map(cls => (
                                        <div key={cls.id} className="flex justify-between items-center bg-[#F8FAFC] p-3 rounded border border-gray-100">
                                            <div>
                                                <h4 className="font-bold text-[#1F4E79] text-sm">{cls.subject}</h4>
                                                <p className="text-xs text-gray-500">
                                                    {cls.start_time} - {cls.end_time} | {cls.teacher_name}
                                                </p>
                                            </div>
                                            <button onClick={() => handleDelete(cls.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {!routine[day] && <p className="text-xs text-gray-400 text-center py-2">No classes.</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}