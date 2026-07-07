import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, Award, TrendingUp, TrendingDown, BookOpen, BarChart3 } from "lucide-react";

export default function StudentExamResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/admin/student/${id}/exam-results`);
                setData(res.data);
            } catch (err) {
                console.error(err);
                alert("Failed to load exam results.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-gray-500">Loading exam results...</div>;
    if (!data) return <div className="p-10 text-center text-gray-500">No data found.</div>;

    const { student, results, summary } = data;

    const getGradeColor = (grade) => {
        if (grade === 'A+') return 'bg-green-100 text-green-700 border-green-200';
        if (grade === 'A' || grade === 'A-') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (grade === 'B') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        if (grade === 'C' || grade === 'D') return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    const getGpaBarColor = (gpa) => {
        if (gpa >= 4.5) return 'bg-green-500';
        if (gpa >= 3.5) return 'bg-blue-500';
        if (gpa >= 3.0) return 'bg-yellow-500';
        if (gpa >= 2.0) return 'bg-orange-500';
        return 'bg-red-500';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10 px-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
                <button onClick={() => navigate(`/admin/students/${id}/profile`)} className="flex items-center gap-2 text-gray-600 hover:text-[#1F4E79] font-bold">
                    <ArrowLeft size={20}/> Back to Profile
                </button>
                <h1 className="text-lg font-bold text-[#1F4E79]">Exam Results</h1>
            </div>

            {/* Student Header */}
            <div className="bg-white p-5 rounded-xl shadow border border-gray-200 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1F4E79] rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {student?.user?.name?.charAt(0) || 'S'}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{student?.user?.name}</h2>
                    <p className="text-sm text-gray-500">ID: {student?.student_id_card_no || 'N/A'}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <BookOpen className="mx-auto text-[#1F4E79] mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">{summary.total_exams}</p>
                    <p className="text-xs text-gray-500 font-medium">Total Exams</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <BarChart3 className="mx-auto text-blue-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">{summary.average_gpa}</p>
                    <p className="text-xs text-gray-500 font-medium">Average GPA</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <TrendingUp className="mx-auto text-green-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">{summary.highest_gpa}</p>
                    <p className="text-xs text-gray-500 font-medium">Highest GPA</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <TrendingDown className="mx-auto text-red-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">{summary.lowest_gpa}</p>
                    <p className="text-xs text-gray-500 font-medium">Lowest GPA</p>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-[#1F4E79] flex items-center gap-2">
                        <Award size={20}/> All Exam Results
                    </h3>
                </div>

                {results.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <Award size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-lg font-medium">No exam results found</p>
                        <p className="text-sm">Results will appear here once exams are graded.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="p-4 text-left">Exam Name</th>
                                    <th className="p-4 text-left hidden md:table-cell">Course</th>
                                    <th className="p-4 text-left hidden sm:table-cell">Date</th>
                                    <th className="p-4 text-center">Marks</th>
                                    <th className="p-4 text-center">GPA</th>
                                    <th className="p-4 text-center">Grade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {results.map((result) => (
                                    <tr key={result.id} className="hover:bg-gray-50 transition">
                                        <td className="p-4 font-bold text-gray-900">{result.exam?.name || 'N/A'}</td>
                                        <td className="p-4 text-gray-600 hidden md:table-cell">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs border border-blue-100">
                                                {result.exam?.course?.title || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 hidden sm:table-cell">{result.exam?.date || 'N/A'}</td>
                                        <td className="p-4 text-center">
                                            <span className="text-gray-900 font-bold">{result.total_obtained}</span>
                                            <span className="text-gray-400">/{result.exam?.total_marks || 0}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-bold text-gray-900">{result.gpa}</span>
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${getGpaBarColor(result.gpa)}`} style={{ width: `${(result.gpa / 5) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getGradeColor(result.grade)}`}>
                                                {result.grade}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Subject-wise Detail for Each Exam */}
            {results.map((result) => (
                result.marks_details && Object.keys(result.marks_details).length > 0 && (
                    <div key={`detail-${result.id}`} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-[#1F4E79]">{result.exam?.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getGradeColor(result.grade)}`}>
                                {result.grade} ({result.gpa} GPA)
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-5">
                            {Object.entries(result.marks_details).map(([subject, marks]) => {
                                const pct = marks >= 80 ? 'text-green-600 bg-green-50 border-green-100' :
                                    marks >= 60 ? 'text-blue-600 bg-blue-50 border-blue-100' :
                                    marks >= 40 ? 'text-yellow-600 bg-yellow-50 border-yellow-100' :
                                    'text-red-600 bg-red-50 border-red-100';
                                return (
                                    <div key={subject} className={`p-3 rounded-lg border text-center ${pct}`}>
                                        <p className="text-xs text-gray-500 font-medium truncate">{subject}</p>
                                        <p className="text-xl font-bold">{marks}</p>
                                        <p className="text-xs opacity-70">out of 100</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            ))}
        </div>
    );
}
