import { useEffect, useState } from "react";
import api from "../../services/api";
import { Plus, MoreVertical, Edit, Trash2, Search, BookOpen } from "lucide-react";

export default function CourseManager() {
    const [courses, setCourses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', category: '', fee: '', description: '' });
    const [editingId, setEditingId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchCourses = async () => {
        try {
            const res = await api.get('/public/courses');
            setCourses(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchCourses();
        document.addEventListener("click", (e) => {
            if (!e.target.closest(".action-menu-btn")) setOpenMenuId(null);
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/admin/courses/${editingId}`, formData);
                alert("Updated Successfully!");
            } else {
                await api.post('/admin/courses', formData);
                alert("Created Successfully!");
            }
            setIsModalOpen(false);
            setFormData({ title: '', category: '', fee: '', description: '' });
            setEditingId(null);
            fetchCourses();
        } catch (error) { 
            alert(error.response?.data?.message || "Failed to save"); 
        }
    };

    const handleEdit = (course) => {
        setFormData(course);
        setEditingId(course.id);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleDelete = async (id) => {
        if(confirm('Are you sure? This will delete all batches and exams related to this course.')) {
            try {
                await api.delete(`/admin/courses/${id}`);
                alert("Course Deleted Successfully");
                fetchCourses();
            } catch (error) {
                console.error(error);
                // আসল এরর দেখানো হচ্ছে
                alert("Failed: " + (error.response?.data?.message || error.message));
            }
        }
    };

    const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79]">Courses</h1>
                    <p className="text-sm text-gray-500">Manage academic programs</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input 
                            type="text" placeholder="Search..." 
                            className="w-full pl-9 pr-4 py-2 border rounded-md focus:outline-none focus:border-[#1F4E79] text-sm"
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    </div>
                    <button onClick={() => { setEditingId(null); setFormData({}); setIsModalOpen(true); }} className="bg-[#1F4E79] text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-[#163859]">
                        <Plus size={16} /> Add
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                            <tr>
                                <th className="p-4">Course Name</th>
                                <th className="p-4 hidden md:table-cell">Category</th>
                                <th className="p-4">Fee</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCourses.map(course => (
                                <tr key={course.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded text-[#1F4E79] hidden md:block">
                                                <BookOpen size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{course.title}</p>
                                                <p className="text-xs text-gray-500 md:hidden">{course.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 hidden md:table-cell">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold uppercase">{course.category}</span>
                                    </td>
                                    <td className="p-4 font-bold text-[#1F4E79]">৳{course.fee}</td>
                                    <td className="p-4 text-right relative">
                                        <button className="action-menu-btn p-1.5 hover:bg-gray-200 rounded-full text-gray-500" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === course.id ? null : course.id); }}>
                                            <MoreVertical size={16} />
                                        </button>
                                        {openMenuId === course.id && (
                                            <div className="absolute right-8 top-2 w-32 bg-white border border-gray-200 shadow-lg rounded z-10">
                                                <button onClick={() => handleEdit(course)} className="w-full px-4 py-2 text-xs text-left hover:bg-gray-50 flex items-center gap-2">
                                                    <Edit size={14}/> Edit
                                                </button>
                                                <button onClick={() => handleDelete(course.id)} className="w-full px-4 py-2 text-xs text-left text-red-600 hover:bg-red-50 flex items-center gap-2">
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
                        <h3 className="font-bold text-lg mb-4 text-[#1F4E79] border-b pb-2">{editingId ? 'Edit Course' : 'Add Course'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Course Title" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Category" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                                <input className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Fee" type="number" required value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} />
                            </div>
                            <textarea className="w-full border p-2 rounded text-sm focus:border-[#1F4E79] outline-none" placeholder="Description" rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
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