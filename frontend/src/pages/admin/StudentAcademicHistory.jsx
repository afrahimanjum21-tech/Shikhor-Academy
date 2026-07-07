import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, GraduationCap, School, Award, BarChart3, BookOpen, Calendar, User, Briefcase } from "lucide-react";

export default function StudentAcademicHistory() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [examData, setExamData] = useState(null);
    const [attendanceData, setAttendanceData] = useState(null);
    const [paymentData, setPaymentData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentRes, examRes, attendRes, payRes] = await Promise.all([
                    api.get(`/admin/student/${id}`),
                    api.get(`/admin/student/${id}/exam-results`),
                    api.get(`/admin/student/${id}/attendance`),
                    api.get(`/admin/student/${id}/payment-history`),
                ]);
                setStudent(studentRes.data);
                setExamData(examRes.data);
                setAttendanceData(attendRes.data);
                setPaymentData(payRes.data);
            } catch (err) {
                console.error(err);
                alert("Failed to load academic history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-gray-500">Loading academic history...</div>;
    if (!student) return <div className="p-10 text-center text-gray-500">Student not found.</div>;

    const prof = student.student_profile || {};
    const course = prof.batch?.course || prof.admission?.course || null;

    const getGradeColor = (grade) => {
        if (grade === 'A+') return 'bg-green-100 text-green-700 border-green-200';
        if (grade === 'A' || grade === 'A-') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (grade === 'B') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        if (grade === 'C' || grade === 'D') return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10 px-4">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
                <button onClick={() => navigate(`/admin/students/${id}/profile`)} className="flex items-center gap-2 text-gray-600 hover:text-[#1F4E79] font-bold">
                    <ArrowLeft size={20}/> Back to Profile
                </button>
                <h1 className="text-lg font-bold text-[#1F4E79]">Academic History</h1>
            </div>

            {/* Student Profile Card */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-[#1F4E79] to-[#2d6a9f]"></div>
                <div className="px-8 pb-6 flex flex-col md:flex-row items-center md:items-end -mt-12 gap-6">
                    <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg border-4 border-white overflow-hidden flex-shrink-0 flex items-center justify-center bg-gray-100">
                        <span className="text-4xl font-bold text-[#1F4E79]">{student.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                        <p className="text-gray-500">ID: {prof.student_id_card_no || 'N/A'}</p>
                    </div>
                    <div className="flex gap-3 text-center">
                        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                            <p className="text-xs text-gray-500">Batch</p>
                            <p className="font-bold text-blue-700 text-sm">{prof.batch?.name || 'N/A'}</p>
                        </div>
                        <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                            <p className="text-xs text-gray-500">Course</p>
                            <p className="font-bold text-green-700 text-sm">{course?.title || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center cursor-pointer hover:shadow-md transition"
                    onClick={() => navigate(`/admin/students/${id}/exam-results`)}>
                    <Award className="mx-auto text-purple-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">{examData?.summary.total_exams || 0}</p>
                    <p className="text-xs text-gray-500 font-medium">Total Exams</p>
                    <p className="text-xs text-purple-500 mt-1">Avg GPA: {examData?.summary.average_gpa || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center cursor-pointer hover:shadow-md transition"
                    onClick={() => navigate(`/admin/students/${id}/attendance`)}>
                    <GraduationCap className="mx-auto text-green-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">{attendanceData?.summary.percentage || 0}%</p>
                    <p className="text-xs text-gray-500 font-medium">Attendance Rate</p>
                    <p className="text-xs text-green-500 mt-1">{attendanceData?.summary.present || 0}/{attendanceData?.summary.total_classes || 0} classes</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center cursor-pointer hover:shadow-md transition"
                    onClick={() => navigate(`/admin/students/${id}/payment-history`)}>
                    <BookOpen className="mx-auto text-blue-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">&#2547;{paymentData?.total_paid || 0}</p>
                    <p className="text-xs text-gray-500 font-medium">Total Paid</p>
                    <p className="text-xs text-red-500 mt-1">Due: &#2547;{paymentData?.total_due || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center">
                    <Calendar className="mx-auto text-orange-500 mb-2" size={24} />
                    <p className="text-2xl font-bold text-gray-900">{prof.admission_date || 'N/A'}</p>
                    <p className="text-xs text-gray-500 font-medium">Admission Date</p>
                    <p className="text-xs text-orange-500 mt-1">{paymentData?.due_months?.length || 0} months due</p>
                </div>
            </div>

            {/* Academic Background */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                    <h3 className="text-lg font-bold text-[#1F4E79] border-b pb-2 mb-4 flex items-center gap-2">
                        <School size={20}/> Educational Background
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-600">
                                <School size={16} />
                                <span className="text-sm font-medium">Last School</span>
                            </div>
                            <span className="font-bold text-gray-900">{prof.last_school || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Award size={16} />
                                <span className="text-sm font-medium">SSC GPA</span>
                            </div>
                            <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                                (prof.ssc_gpa >= 4) ? 'bg-green-100 text-green-700' :
                                (prof.ssc_gpa >= 3) ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                                {prof.ssc_gpa || 'N/A'} {prof.ssc_gpa ? 'out of 5.00' : ''}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Award size={16} />
                                <span className="text-sm font-medium">JSC GPA</span>
                            </div>
                            <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                                (prof.jsc_gpa >= 4) ? 'bg-green-100 text-green-700' :
                                (prof.jsc_gpa >= 3) ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                                {prof.jsc_gpa || 'N/A'} {prof.jsc_gpa ? 'out of 5.00' : ''}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                    <h3 className="text-lg font-bold text-[#1F4E79] border-b pb-2 mb-4 flex items-center gap-2">
                        <User size={20}/> Personal & Guardian Info
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Father</span>
                            <span className="font-medium text-gray-900">{prof.father_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Father Mobile</span>
                            <span className="font-medium text-gray-900">{prof.father_mobile || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Mother</span>
                            <span className="font-medium text-gray-900">{prof.mother_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Mother Mobile</span>
                            <span className="font-medium text-gray-900">{prof.mother_mobile || 'N/A'}</span>
                        </div>
                        <div className="border-t border-dashed my-2"></div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Date of Birth</span>
                            <span className="font-medium text-gray-900">{prof.dob || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Gender</span>
                            <span className="font-medium text-gray-900">{prof.gender || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Blood Group</span>
                            <span className="font-medium text-gray-900">{prof.blood_group || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Religion</span>
                            <span className="font-medium text-gray-900">{prof.religion || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Exam Results */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#1F4E79] flex items-center gap-2">
                        <BarChart3 size={20}/> Recent Exam Results
                    </h3>
                    <button onClick={() => navigate(`/admin/students/${id}/exam-results`)} className="text-sm text-[#1F4E79] font-bold hover:underline">View All →</button>
                </div>
                {examData && examData.results.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                                <tr>
                                    <th className="p-4 text-left">Exam</th>
                                    <th className="p-4 text-left hidden md:table-cell">Course</th>
                                    <th className="p-4 text-center">Marks</th>
                                    <th className="p-4 text-center">GPA</th>
                                    <th className="p-4 text-center">Grade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {examData.results.slice(0, 5).map((result) => (
                                    <tr key={result.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-900">{result.exam?.name}</td>
                                        <td className="p-4 hidden md:table-cell text-gray-600">{result.exam?.course?.title || 'N/A'}</td>
                                        <td className="p-4 text-center">
                                            <span className="font-bold">{result.total_obtained}</span>/{result.exam?.total_marks || 0}
                                        </td>
                                        <td className="p-4 text-center font-bold">{result.gpa}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getGradeColor(result.grade)}`}>{result.grade}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400">
                        <Award size={36} className="mx-auto mb-2 opacity-30" />
                        <p>No exam results yet</p>
                    </div>
                )}
            </div>

            {/* Monthly Attendance Overview */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#1F4E79] flex items-center gap-2">
                        <GraduationCap size={20}/> Monthly Attendance
                    </h3>
                    <button onClick={() => navigate(`/admin/students/${id}/attendance`)} className="text-sm text-[#1F4E79] font-bold hover:underline">View All →</button>
                </div>
                {attendanceData && Object.keys(attendanceData.monthly_stats).length > 0 ? (
                    <div className="p-5 space-y-3">
                        {Object.entries(attendanceData.monthly_stats).slice(0, 6).map(([month, stats]) => (
                            <div key={month} className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600 w-32 flex-shrink-0">{month}</span>
                                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden flex">
                                    <div className="h-full bg-green-500" style={{ width: `${stats.percentage}%` }}></div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-xs text-green-600 font-medium">{stats.present}/{stats.total}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${stats.percentage >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {stats.percentage}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400">
                        <GraduationCap size={36} className="mx-auto mb-2 opacity-30" />
                        <p>No attendance records yet</p>
                    </div>
                )}
            </div>

            {/* Payment Overview */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#1F4E79] flex items-center gap-2">
                        <BookOpen size={20}/> Payment Overview
                    </h3>
                    <button onClick={() => navigate(`/admin/students/${id}/payment-history`)} className="text-sm text-[#1F4E79] font-bold hover:underline">View All →</button>
                </div>
                <div className="p-5">
                    {paymentData && (
                        <>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                                    <p className="text-xs text-green-600 font-medium">Total Paid</p>
                                    <p className="text-xl font-bold text-green-700">&#2547;{paymentData.total_paid}</p>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                                    <p className="text-xs text-red-600 font-medium">Total Due</p>
                                    <p className="text-xl font-bold text-red-700">&#2547;{paymentData.total_due}</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                                    <p className="text-xs text-blue-600 font-medium">Monthly Fee</p>
                                    <p className="text-xl font-bold text-blue-700">&#2547;{paymentData.course_fee}</p>
                                </div>
                            </div>
                            {paymentData.due_months.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-bold text-red-600 mb-2">Unpaid Months:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {paymentData.due_months.map(month => (
                                            <span key={month} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">{month}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
