import { useEffect, useState } from "react";
import api from "../../services/api";
import { Award, BookOpen, Users, Save } from "lucide-react";
import notify from "../../services/notification";
import logger from '../../services/logger';

export default function TeacherMarks() {
    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [students, setStudents] = useState([]);
    const [marks, setMarks] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const { data } = await api.get('/teacher/exams');
            setExams(data);
        } catch (error) {
            logger.error('Failed to fetch exams:', error);
        }
    };

    const fetchStudents = async (examId) => {
        try {
            setLoading(true);
            const { data } = await api.get(`/teacher/exams/${examId}/students`);
            setStudents(data.students);
            const initialMarks = {};
            data.students.forEach(({ student, existing_result }) => {
                initialMarks[student.id] = existing_result?.marks_details || {};
            });
            setMarks(initialMarks);
        } catch (error) {
            logger.error('Failed to fetch students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExamChange = (examId) => {
        setSelectedExam(examId);
        if (examId) {
            fetchStudents(examId);
        }
    };

    const handleMarkChange = (studentId, subject, value) => {
        setMarks({
            ...marks,
            [studentId]: {
                ...marks[studentId],
                [subject]: parseFloat(value) || 0
            }
        });
    };

    const saveMarks = async () => {
        if (!selectedExam) return;

        const marksData = Object.keys(marks).map(studentId => ({
            student_id: parseInt(studentId),
            details: marks[studentId]
        }));

        try {
            await api.post('/teacher/exams/marks', {
                exam_id: selectedExam,
                marks_data: marksData
            });
            notify.success('Marks saved successfully');
        } catch (error) {
            logger.error('Failed to save marks:', error);
            notify.error('Failed to save marks');
        }
    };

    const selectedExamData = exams.find(e => e.id === selectedExam);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Marks Entry</h1>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
                    <select
                        value={selectedExam || ''}
                        onChange={(e) => handleExamChange(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                    >
                        <option value="">Select an exam</option>
                        {exams.map((exam) => (
                            <option key={exam.id} value={exam.id}>
                                {exam.name} - {exam.course?.title} ({new Date(exam.date).toLocaleDateString()})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Marks Entry Table */}
            {selectedExam && students.length > 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Enter Marks</h2>
                        <button
                            onClick={saveMarks}
                            className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors flex items-center gap-2"
                        >
                            <Save size={16} /> Save Marks
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Student</th>
                                    {selectedExamData?.subjects?.map((subject) => (
                                        <th key={subject} className="px-4 py-3 text-center text-sm font-bold text-gray-700">
                                            {subject}<br />
                                            <span className="text-xs text-gray-500">({selectedExamData.subject_marks?.[subject] || 100})</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(({ student }) => (
                                    <tr key={student.id} className="border-t border-gray-100">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-[#1F4E79] flex items-center justify-center text-white font-bold text-sm">
                                                    {student.user?.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{student.user?.name}</p>
                                                    <p className="text-xs text-gray-500">{student.student_id_card_no}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {selectedExamData?.subjects?.map((subject) => (
                                            <td key={subject} className="px-4 py-3 text-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={selectedExamData.subject_marks?.[subject] || 100}
                                                    value={marks[student.id]?.[subject] || ''}
                                                    onChange={(e) => handleMarkChange(student.id, subject, e.target.value)}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent text-center"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">Loading students...</div>
                </div>
            )}
        </div>
    );
}
