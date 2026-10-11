import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { Award, BookOpen, CheckCircle2, GraduationCap, Loader2, Save, School, Send, Users } from "lucide-react";
import notify from "../../services/notification";
import logger from '../../services/logger';
import { useConfirm } from "../../components/common/ConfirmDialog";

export default function TeacherMarks() {
    const confirm = useConfirm();
    const [assignments, setAssignments] = useState([]);
    const [courseId, setCourseId] = useState('');
    const [batchId, setBatchId] = useState('');
    const [subject, setSubject] = useState('');
    const [exams, setExams] = useState([]);
    const [examId, setExamId] = useState('');
    const [examMeta, setExamMeta] = useState(null);
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState({});
    const [comments, setComments] = useState({});
    const [loadingAssignments, setLoadingAssignments] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);

    useEffect(() => {
        api.get('/teacher/results/assignments')
            .then(({ data }) => setAssignments(data))
            .catch((error) => logger.error('Failed to fetch assignments:', error))
            .finally(() => setLoadingAssignments(false));
    }, []);

    const selectedCourse = assignments.find(c => c.course_id === Number(courseId));
    const selectedBatch = selectedCourse?.batches?.find(b => b.batch_id === Number(batchId));

    const handleCourseChange = (value) => {
        setCourseId(value);
        setBatchId('');
        setSubject('');
        setExamId('');
        setExams([]);
        setStudents([]);
        setMarks({});
        setComments({});
        setExamMeta(null);
    };

    const handleBatchChange = (value) => {
        setBatchId(value);
        setSubject('');
        setExamId('');
        setExams([]);
        setStudents([]);
        setMarks({});
        setComments({});
        setExamMeta(null);
    };

    const handleSubjectChange = async (value) => {
        setSubject(value);
        setExamId('');
        setExams([]);
        setStudents([]);
        setMarks({});
        setComments({});
        setExamMeta(null);
        if (!value) return;
        try {
            const { data } = await api.get(
                `/teacher/results/exams?course_id=${courseId}&batch_id=${batchId}&subject=${encodeURIComponent(value)}`
            );
            setExams(data.exams || []);
        } catch (error) {
            logger.error('Failed to fetch exams:', error);
            notify.error(error.response?.data?.message || 'Failed to load exams');
        }
    };

    const handleExamChange = async (value) => {
        setExamId(value);
        setStudents([]);
        setMarks({});
        setComments({});
        setExamMeta(null);
        if (!value) return;
        try {
            setLoadingStudents(true);
            const { data } = await api.get(
                `/teacher/results/students?exam_id=${value}&batch_id=${batchId}&subject=${encodeURIComponent(subject)}`
            );
            setExamMeta({ full_marks: data.full_marks, published: data.published, exam: data.exam });
            setStudents(data.students || []);
            const nextMarks = {};
            const nextComments = {};
            (data.students || []).forEach(s => {
                nextMarks[s.student.id] = s.obtained === '' ? '' : s.obtained;
                nextComments[s.student.id] = s.teacher_comment || '';
            });
            setMarks(nextMarks);
            setComments(nextComments);
        } catch (error) {
            logger.error('Failed to fetch students:', error);
            notify.error(error.response?.data?.message || 'Failed to load students');
        } finally {
            setLoadingStudents(false);
        }
    };

    const saveMarks = async () => {
        if (!examId) return;
        setSaving(true);
        try {
            const fullMarks = Number(examMeta?.full_marks) || Infinity;
            const payload = {
                exam_id: examId,
                batch_id: batchId,
                subject,
                marks: students
                    .filter(s => {
                        const v = marks[s.student.id];
                        return v !== '' && v !== undefined && v !== null && Number.isFinite(Number(v));
                    })
                    .map(s => ({
                        student_id: s.student.id,
                        obtained: Math.min(Math.max(Number(marks[s.student.id]), 0), fullMarks),
                        teacher_comment: comments[s.student.id] || null,
                    })),
            };
            const { data } = await api.post('/teacher/results/marks', payload);
            notify.success(`Marks saved for ${data.count} students`);
            await handleExamChange(examId);
        } catch (error) {
            logger.error('Failed to save marks:', error);
            notify.error(error.response?.data?.message || 'Failed to save marks');
        } finally {
            setSaving(false);
        }
    };

    const togglePublish = async () => {
        if (!examId) return;
        const willPublish = !examMeta?.published;
        const ok = await confirm({
            title: willPublish ? 'Publish Results?' : 'Unpublish Results?',
            message: willPublish
                ? `Publish the ${subject} results of "${examMeta?.exam?.name}"? Students in your batch(es) will be notified that their result is available.`
                : `Unpublish the ${subject} results of "${examMeta?.exam?.name}"? Students will no longer see this result.`,
            confirmText: willPublish ? 'Publish' : 'Unpublish',
            variant: willPublish ? undefined : 'destructive',
        });
        if (!ok) return;
        setPublishing(true);
        try {
            await api.post('/teacher/results/publish', { exam_id: examId, subject, publish: willPublish });
            notify.success(willPublish ? 'Results published successfully' : 'Results unpublished');
            setExamMeta(prev => ({ ...prev, published: willPublish }));
            setExams(prev => prev.map(ex => (ex.id === examId ? { ...ex, subject_published: willPublish } : ex)));
        } catch (error) {
            logger.error('Failed to update publish status:', error);
            notify.error(error.response?.data?.message || 'Failed to update publish status');
        } finally {
            setPublishing(false);
        }
    };

    const ready = Boolean(courseId && batchId && subject && examId);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Marks & Results</h1>
                <p className="text-sm text-gray-500">
                    Select the class, batch, subject and exam for your batch, then enter and publish the results.
                </p>
            </div>

            {/* Step 1-2: Class and Batch */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-700 mb-1">1. Select Class</h2>
                <p className="text-xs text-gray-400 mb-4">The class/grade you teach (e.g. Class 9, Class 10, Intermediate).</p>
                {loadingAssignments ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="animate-spin" size={16} /> Loading your classes...
                    </div>
                ) : assignments.length === 0 ? (
                    <p className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4">
                        No classes have been assigned to you yet. Please contact the admin.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                                <School size={14} /> Class / Grade
                            </label>
                            <select
                                value={courseId}
                                onChange={(e) => handleCourseChange(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent bg-white"
                            >
                                <option value="">Select a class</option>
                                {assignments.map(c => (
                                    <option key={c.course_id} value={c.course_id}>{c.course_title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                                <Users size={14} /> Batch
                            </label>
                            <select
                                value={batchId}
                                onChange={(e) => handleBatchChange(e.target.value)}
                                disabled={!courseId}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400"
                            >
                                <option value="">Select a batch</option>
                                {selectedCourse?.batches?.map(b => (
                                    <option key={b.batch_id} value={b.batch_id}>{b.batch_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 3-4: Subject and Exam */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-gray-700 mb-1">2. Select Subject & Exam</h2>
                <p className="text-xs text-gray-400 mb-4">The subject you taught in this batch, then the examination you evaluated.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                            <BookOpen size={14} /> Subject
                        </label>
                        <select
                            value={subject}
                            onChange={(e) => handleSubjectChange(e.target.value)}
                            disabled={!batchId}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            <option value="">Select a subject</option>
                            {selectedBatch?.subjects?.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                            <GraduationCap size={14} /> Examination
                        </label>
                        <select
                            value={examId}
                            onChange={(e) => handleExamChange(e.target.value)}
                            disabled={!subject}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            <option value="">Select an exam</option>
                            {exams.map(ex => (
                                <option key={ex.id} value={ex.id}>
                                    {ex.name} ({ex.type === 'mcq' ? 'MCQ' : ex.type || 'Exam'}{ex.date ? `, ${ex.date}` : ''}){ex.subject_published ? ' - Published' : ''}
                                </option>
                            ))}
                        </select>
                        {subject && exams.length === 0 && (
                            <p className="text-xs text-amber-600 mt-2">
                                No exams include {subject} for this class yet. The admin needs to add {subject} to an exam first.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Marks table */}
            {ready && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                Enter Marks
                                {examMeta?.published && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                                        <CheckCircle2 size={13} /> Published
                                    </span>
                                )}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {selectedCourse?.course_title} - {selectedBatch?.batch_name} • {subject} • {examMeta?.exam?.name}
                                {examMeta ? ` • Full marks: ${examMeta.full_marks}` : ''}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={saveMarks}
                                disabled={saving || students.length === 0}
                                className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Marks
                            </button>
                            <button
                                onClick={togglePublish}
                                disabled={publishing || students.length === 0}
                                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${
                                    examMeta?.published
                                        ? 'bg-white border border-red-300 text-red-600 hover:bg-red-50'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                            >
                                {publishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                {examMeta?.published ? 'Unpublish' : 'Publish Results'}
                            </button>
                        </div>
                    </div>

                    {loadingStudents ? (
                        <div className="flex items-center justify-center h-48 text-gray-500">
                            <Loader2 className="animate-spin mr-2" size={20} /> Loading students...
                        </div>
                    ) : students.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-10 text-center">
                            <Users className="mx-auto text-gray-300 mb-3" size={40} />
                            <p className="text-gray-500">No students are enrolled in this batch yet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Student</th>
                                            <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                                                Marks ({subject})
                                                <span className="block text-xs text-gray-500 font-normal">max {examMeta?.full_marks}</span>
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Teacher Comment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(({ student }) => (
                                            <tr key={student.id} className="border-t border-gray-100">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-[#1F4E79] flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                                                            {student.User?.profile_photo_path ? (
                                                                <img src={buildAssetUrl(student.User.profile_photo_path)} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                student.User?.name?.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-800">{student.User?.name}</p>
                                                            <p className="text-xs text-gray-500">{student.student_id_card_no}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={examMeta?.full_marks}
                                                        value={marks[student.id] ?? ''}
                                                        onChange={(e) => setMarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                                                        className="w-24 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent text-center"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Optional comment..."
                                                        value={comments[student.id] || ''}
                                                        onChange={(e) => setComments(prev => ({ ...prev, [student.id]: e.target.value }))}
                                                        className="w-full max-w-xs px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent text-sm"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                                    <Award size={14} /> Save first, then publish. Students can only see published results.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
