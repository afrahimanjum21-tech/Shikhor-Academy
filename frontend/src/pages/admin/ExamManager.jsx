import { useEffect, useState } from "react";
import api from "../../services/api";
import { Plus, Save, ArrowLeft, Grid, FileText, CheckCircle2, Eye, EyeOff, Trash2, BookOpen, Award, Megaphone } from "lucide-react";

const BD_SUBJECTS = [
    "Bangla 1st", "Bangla 2nd", "English 1st", "English 2nd",
    "Mathematics", "Physics", "Chemistry", "Biology",
    "Higher Math", "ICT", "BGS", "Religion", "Accounting", "Finance"
];

export default function ExamManager() {
    const [exams, setExams] = useState([]);
    const [courses, setCourses] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('monthly'); // monthly | mcq
    const [selectedExam, setSelectedExam] = useState(null);
    const [examData, setExamData] = useState(null); // students + subjects from getExamData
    const [marksInput, setMarksInput] = useState({});

    const fetchData = async () => {
        try {
            const [examRes, courseRes] = await Promise.all([
                api.get('/admin/exams'),
                api.get('/public/courses')
            ]);
            setExams(examRes.data);
            setCourses(courseRes.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchData(); }, []);

    const openMarksEntry = async (exam) => {
        setSelectedExam(exam);
        try {
            const res = await api.get(`/admin/exams/${exam.id}/students`);
            setExamData(res.data);

            const existing = {};
            (res.data.students || []).forEach(std => {
                if (std.exam_results && std.exam_results.length > 0) {
                    existing[std.id] = std.exam_results[0].marks_details || {};
                }
            });
            setMarksInput(existing);
        } catch (err) {
            console.error(err);
            alert("Failed to load exam data");
        }
    };

    const handleMarkChange = (studentId, subject, value, fullMark) => {
        const v = value === '' ? '' : Math.min(Number(value), fullMark);
        setMarksInput(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [subject]: v }
        }));
    };

    const calcTotal = (studentId) => {
        const m = marksInput[studentId] || {};
        return Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0);
    };

    const submitMarks = async () => {
        const payload = Object.keys(marksInput).map(stdId => ({
            student_id: stdId,
            details: marksInput[stdId]
        }));
        if (payload.length === 0) return alert("No marks entered!");

        try {
            await api.post('/admin/exams/marks', { exam_id: selectedExam.id, marks_data: payload });
            alert("Results Saved! Remember to Publish so students can see them.");
        } catch (err) { alert("Failed to save marks"); }
    };

    const togglePublish = async (exam) => {
        try {
            await api.post(`/admin/exams/${exam.id}/publish`);
            fetchData();
            if (selectedExam?.id === exam.id) {
                setSelectedExam({ ...exam, is_published: !exam.is_published });
            }
        } catch (err) { alert("Failed to toggle publish"); }
    };

    const deleteExam = async (exam) => {
        if (!confirm(`Delete "${exam.name}"? All its results will also be deleted.`)) return;
        try {
            await api.delete(`/admin/exams/${exam.id}`);
            fetchData();
        } catch (err) { alert("Failed to delete exam"); }
    };

    const subjectMarksMap = examData?.subject_marks || {};
    const examTotalMarks = examData?.total_marks || (selectedExam?.total_marks || 0);

    const filteredExams = exams.filter(e => (e.type || 'monthly') === activeTab);

    // ---------- MARKSHEET VIEW ----------
    if (selectedExam && examData) {
        const subjects = examData.subjects || selectedExam.subjects || [];
        const students = examData.students || [];

        return (
            <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
                <div className="bg-gray-100 border-b p-3 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setSelectedExam(null); setExamData(null); }}
                            className="flex items-center gap-1 text-gray-700 hover:text-blue-600 font-bold text-sm px-2 py-1 hover:bg-gray-200 rounded">
                            <ArrowLeft size={16} /> Back
                        </button>
                        <span className="text-sm font-bold text-gray-700 border-l pl-3">
                            {selectedExam.name}
                            <span className="ml-2 text-xs text-gray-500">
                                ({selectedExam.type === 'mcq' ? 'Weekly MCQ' : 'Monthly Exam'})
                            </span>
                        </span>
                        {selectedExam.is_published ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                <Eye size={12} /> Published
                            </span>
                        ) : (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                <EyeOff size={12} /> Draft
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={submitMarks}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
                            <Save size={16} /> Save Marks
                        </button>
                        <button onClick={() => togglePublish(selectedExam)}
                            className={`px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 ${selectedExam.is_published ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                            {selectedExam.is_published ? <><EyeOff size={16}/> Unpublish</> : <><Megaphone size={16}/> Publish</>}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-gray-200 p-1">
                    <table className="border-separate border-spacing-0 bg-white">
                        <thead className="sticky top-0 z-20">
                            <tr>
                                <th className="border-b border-r border-gray-400 bg-gray-300 px-3 py-2 text-xs text-gray-700">#</th>
                                <th className="border-b border-r border-gray-400 bg-gray-300 px-3 py-2 text-left text-xs text-gray-700 min-w-[180px]">Student Name</th>
                                <th className="border-b border-r border-gray-400 bg-gray-300 px-3 py-2 text-xs text-gray-700 w-28">ID No</th>
                                {subjects.map(sub => {
                                    const full = subjectMarksMap[sub] || 100;
                                    return (
                                        <th key={sub} className="border-b border-r border-gray-400 bg-gradient-to-b from-gray-100 to-gray-300 px-2 py-2 text-center text-xs text-gray-700 w-24">
                                            {sub}
                                            <span className="block text-[10px] text-gray-500">/ {full}</span>
                                        </th>
                                    );
                                })}
                                <th className="border-b border-gray-400 bg-yellow-100 px-2 py-2 text-center text-xs text-gray-700 w-24">Total<br/><span className="text-[10px] text-gray-500">/ {examTotalMarks}</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length === 0 ? (
                                <tr><td colSpan={subjects.length + 4} className="p-8 text-center text-gray-400">No students found for this course.</td></tr>
                            ) : students.map((std, idx) => {
                                const total = calcTotal(std.id);
                                return (
                                    <tr key={std.id} className="h-9 hover:bg-blue-50/30">
                                        <td className="border-b border-r border-gray-200 bg-gray-100 text-center text-xs text-gray-500">{idx + 1}</td>
                                        <td className="border-b border-r border-gray-200 px-3 text-sm text-gray-800 whitespace-nowrap">{std.user?.name || 'Unknown'}</td>
                                        <td className="border-b border-r border-gray-200 px-2 text-xs text-gray-500 font-mono text-center">{std.student_id_card_no}</td>
                                        {subjects.map(sub => {
                                            const full = subjectMarksMap[sub] || 100;
                                            const val = marksInput[std.id]?.[sub];
                                            const isFail = val !== '' && val !== undefined && Number(val) < (full * 0.33);
                                            return (
                                                <td key={sub} className={`border-b border-r border-gray-200 p-0 text-center ${isFail ? 'bg-red-50' : 'bg-white'}`}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={full}
                                                        value={val ?? ''}
                                                        onChange={(e) => handleMarkChange(std.id, sub, e.target.value, full)}
                                                        className="w-full h-full text-center outline-none focus:ring-2 focus:ring-blue-500 bg-transparent text-sm py-1"
                                                    />
                                                </td>
                                            );
                                        })}
                                        <td className="border-b border-gray-400 bg-yellow-50 text-center font-bold text-sm text-gray-800">{total || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // ---------- EXAM LIST VIEW ----------
    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center flex-wrap gap-3">
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('monthly')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeTab === 'monthly' ? 'bg-[#1F4E79] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <FileText size={16}/> Monthly Exams
                    </button>
                    <button onClick={() => setActiveTab('mcq')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${activeTab === 'mcq' ? 'bg-[#1F4E79] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <Award size={16}/> Weekly MCQ
                    </button>
                </div>
                <button onClick={() => setIsModalOpen(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 shadow-sm">
                    <Plus size={18} /> New {activeTab === 'mcq' ? 'MCQ Exam' : 'Exam'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredExams.length === 0 ? (
                    <div className="col-span-full bg-white rounded-lg shadow p-10 text-center text-gray-400">
                        <FileText size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-lg font-medium">No {activeTab === 'mcq' ? 'MCQ' : 'monthly'} exams yet</p>
                        <p className="text-sm">Click "New Exam" to create one.</p>
                    </div>
                ) : filteredExams.map(exam => (
                    <div key={exam.id} className="border border-gray-300 rounded-lg shadow-sm bg-white p-4 hover:shadow-md transition flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg text-gray-800">{exam.name}</h3>
                            {exam.is_published ? (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                    <Eye size={12}/> Published
                                </span>
                            ) : (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                    <EyeOff size={12}/> Draft
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Course: <span className="font-medium text-gray-700">{exam.course?.title || 'N/A'}</span></p>
                        <p className="text-xs text-gray-500 mb-2">Date: {exam.date}</p>
                        <div className="flex flex-wrap gap-1 mb-3">
                            {exam.subjects?.map(sub => (
                                <span key={sub} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                                    {sub} ({exam.subject_marks?.[sub] ?? 100})
                                </span>
                            ))}
                        </div>
                        <div className="text-xs text-gray-600 mb-3 bg-gray-50 px-2 py-1 rounded">Total Marks: <span className="font-bold">{exam.total_marks}</span></div>

                        <div className="flex gap-2 mt-auto">
                            <button onClick={() => openMarksEntry(exam)}
                                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-700 flex justify-center items-center gap-2">
                                <Grid size={16}/> Marksheet
                            </button>
                            <button onClick={() => togglePublish(exam)}
                                title={exam.is_published ? 'Unpublish' : 'Publish results'}
                                className={`px-3 py-2 rounded text-sm font-bold ${exam.is_published ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                {exam.is_published ? <EyeOff size={16}/> : <Megaphone size={16}/>}
                            </button>
                            <button onClick={() => deleteExam(exam)}
                                className="px-3 py-2 rounded bg-red-50 text-red-600 hover:bg-red-100">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <NewExamModal
                    courses={courses}
                    defaultType={activeTab}
                    onClose={() => setIsModalOpen(false)}
                    onCreated={() => { setIsModalOpen(false); fetchData(); }}
                />
            )}
        </div>
    );
}

function NewExamModal({ courses, defaultType, onClose, onCreated }) {
    const [form, setForm] = useState({ name: '', course_id: '', date: '', type: defaultType });
    const [selected, setSelected] = useState([]); // subjects
    const [marks, setMarks] = useState({}); // subject -> full marks
    const [saving, setSaving] = useState(false);

    const toggle = (sub) => {
        if (selected.includes(sub)) {
            setSelected(selected.filter(s => s !== sub));
            const m = { ...marks }; delete m[sub]; setMarks(m);
        } else {
            setSelected([...selected, sub]);
            setMarks({ ...marks, [sub]: form.type === 'mcq' ? 25 : 100 });
        }
    };

    const setMark = (sub, val) => setMarks({ ...marks, [sub]: Math.max(1, Number(val) || 0) });

    const totalMarks = Object.values(marks).reduce((a, b) => a + b, 0);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.course_id || !form.date) return alert("Fill all fields");
        if (selected.length === 0) return alert("Select at least one subject");
        setSaving(true);
        try {
            await api.post('/admin/exams', { ...form, subjects: selected, subject_marks: marks });
            onCreated();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create exam");
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white p-6 rounded-lg w-full max-w-xl shadow-2xl">
                <h3 className="font-bold text-lg mb-4 border-b pb-2 text-gray-800">Create New Exam</h3>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setForm({ ...form, type: 'monthly' })}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${form.type === 'monthly' ? 'border-[#1F4E79] bg-blue-50 text-[#1F4E79]' : 'border-gray-200 text-gray-500'}`}>
                            📝 Monthly Exam
                        </button>
                        <button type="button" onClick={() => setForm({ ...form, type: 'mcq' })}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${form.type === 'mcq' ? 'border-[#1F4E79] bg-blue-50 text-[#1F4E79]' : 'border-gray-200 text-gray-500'}`}>
                            ⚡ Weekly MCQ
                        </button>
                    </div>

                    <input className="w-full border p-2 rounded text-sm" placeholder="Exam Name (e.g. 1st Term / Week 3 Physics)" required
                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

                    <div className="grid grid-cols-2 gap-3">
                        <select className="w-full border p-2 rounded bg-white text-sm" required
                            value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}>
                            <option value="">Select Course</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <input type="date" className="w-full border p-2 rounded text-sm" required
                            value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block font-bold text-sm text-gray-700">Select Subjects & Marks</label>
                            <span className="text-xs text-gray-500">Total: <span className="font-bold text-[#1F4E79]">{totalMarks}</span></span>
                        </div>
                        <div className="border rounded bg-gray-50 max-h-52 overflow-y-auto">
                            {BD_SUBJECTS.map(sub => {
                                const isSel = selected.includes(sub);
                                return (
                                    <div key={sub} className={`flex items-center gap-2 p-2 border-b ${isSel ? 'bg-blue-50' : ''}`}>
                                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                                            <input type="checkbox" checked={isSel} onChange={() => toggle(sub)} />
                                            <span className="text-sm">{sub}</span>
                                        </label>
                                        {isSel && (
                                            <div className="flex items-center gap-1">
                                                <input type="number" min="1" value={marks[sub] ?? 100}
                                                    onChange={e => setMark(sub, e.target.value)}
                                                    className="w-16 border rounded px-2 py-1 text-xs text-center" />
                                                <span className="text-xs text-gray-400">marks</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                            {saving ? 'Creating...' : 'Create Exam'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
