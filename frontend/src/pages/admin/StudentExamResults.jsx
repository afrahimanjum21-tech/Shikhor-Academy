import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import { Award, BookOpen, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import notify from "../../services/notification";
import logger from '../../services/logger';
 
export default function StudentExamResults() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/admin/student/${id}/exam-results`);
                setData(res.data);
            } catch (err) {
                logger.error(err);
                notify.error("Failed to load exam results.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-gray-400">Loading exam results...</div>;
    if (!data) return <div className="p-10 text-center text-gray-400">No data found.</div>;

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
        <div className="space-y-6">
            {/* Page title */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-6 md:px-7 py-4">
                <div>
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Exam Results</h2>
                    <p className="text-xs md:text-sm text-gray-400 mt-0.5">
                        {student?.user?.name} — ID: {student?.student_id_card_no || 'N/A'}
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <SummaryCard icon={BookOpen} label="Total Exams" value={summary.total_exams} color="text-[#1F4E79]" />
                <SummaryCard icon={BarChart3} label="Average GPA" value={summary.average_gpa} color="text-blue-500" />
                <SummaryCard icon={TrendingUp} label="Highest GPA" value={summary.highest_gpa} color="text-green-500" />
                <SummaryCard icon={TrendingDown} label="Lowest GPA" value={summary.lowest_gpa} color="text-red-500" />
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center gap-2.5">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center"><Award size={16} className="text-[#1F4E79]" /></div>
                    <h3 className="text-sm md:text-base font-bold text-gray-900">All Exam Results</h3>
                </div>

                {results.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <Award size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="text-base font-medium">No exam results found</p>
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
                                            <span className="font-bold text-gray-900">{result.total_obtained}</span>
                                            <span className="text-gray-400">/{result.exam?.total_marks || 0}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-bold text-gray-900">{result.gpa}</span>
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${getGpaBarColor(result.gpa)}`} style={{ width: `${(result.gpa / 5) * 100}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getGradeColor(result.grade)}`}>{result.grade}</span>
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
                    <div key={`detail-${result.id}`} className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                        <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h3 className="text-sm md:text-base font-bold text-gray-900">{result.exam?.name}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{result.exam?.date || 'N/A'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getGradeColor(result.grade)}`}>{result.grade} ({result.gpa} GPA)</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${result.pass_fail === 'Pass' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{result.pass_fail}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 md:px-7 py-5 bg-gray-50 border-b border-gray-100">
                            <DetailStat label="Total Marks" value={result.exam?.total_marks || 0} />
                            <DetailStat label="Obtained" value={result.total_obtained} valueClass="text-[#1F4E79]" />
                            <DetailStat label="Position" value={result.position || 'N/A'} />
                            <DetailStat label="Percentage" value={result.exam?.total_marks > 0 ? `${Math.round((result.total_obtained / result.exam.total_marks) * 100)}%` : '0%'} />
                        </div>

                        {result.teacher_comment && (
                            <div className="px-6 md:px-7 py-4 bg-blue-50 border-b border-gray-100">
                                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Teacher Comment</p>
                                <p className="text-sm text-gray-700">{result.teacher_comment}</p>
                            </div>
                        )}

                        <div className="px-6 md:px-7 py-5 md:py-6">
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Subject-wise Marks</h4>
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Subject</th>
                                            <th className="px-4 py-3 text-center">Marks</th>
                                            <th className="px-4 py-3 text-center">Total</th>
                                            <th className="px-4 py-3 text-center">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {Object.entries(result.marks_details).map(([subject, marks]) => {
                                            const totalMarks = result.subject_marks?.[subject] || 100;
                                            const percentage = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
                                            const pct = percentage >= 80 ? 'text-green-600' :
                                                percentage >= 60 ? 'text-blue-600' :
                                                percentage >= 40 ? 'text-yellow-600' : 'text-red-600';
                                            const subjectGrade = percentage >= 80 ? 'A+' :
                                                percentage >= 70 ? 'A' : percentage >= 60 ? 'A-' :
                                                percentage >= 50 ? 'B' : percentage >= 40 ? 'C' :
                                                percentage >= 33 ? 'D' : 'F';
                                            return (
                                                <tr key={subject} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-medium text-gray-800">{subject}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-[#1F4E79]">{marks}</td>
                                                    <td className="px-4 py-3 text-center text-gray-600">{totalMarks}</td>
                                                    <td className={`px-4 py-3 text-center font-bold ${pct}`}>{subjectGrade}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            ))}
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 text-center transition-all duration-300 hover:shadow-lg hover:border-gray-200">
            <Icon size={22} className={`mx-auto mb-2 ${color || 'text-gray-400'}`} />
            <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
        </div>
    );
}

function DetailStat({ label, value, valueClass }) {
    return (
        <div className="text-center">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-bold text-gray-900 mt-0.5 ${valueClass || ''}`}>{value}</p>
        </div>
    );
}
