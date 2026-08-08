import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { School, Award, BarChart3, BookOpen, User, Phone, Calendar, GraduationCap, Building2, Clock } from "lucide-react";
import notify from "../../services/notification";
import logger from '../../services/logger';
 
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
                logger.error(err);
                notify.error("Failed to load academic history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-gray-400">Loading academic history...</div>;
    if (!student) return <div className="p-10 text-center text-gray-400">Student not found.</div>;

    const prof = student.student_profile || {};
    const course = prof.batch?.course || prof.admission?.course || null;

    const getGradeColor = (grade) => {
        if (grade === 'A+') return 'bg-green-100 text-green-700 border-green-200';
        if (grade === 'A' || grade === 'A-') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (grade === 'B') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        if (grade === 'C' || grade === 'D') return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    const gpaColor = (gpa) => {
        if (!gpa) return 'text-gray-400';
        const g = parseFloat(gpa);
        if (g >= 4) return 'text-green-600';
        if (g >= 3) return 'text-blue-600';
        if (g >= 2) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            {/* Page title */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-6 md:px-7 py-4">
                <div>
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Academic History</h2>
                    <p className="text-xs md:text-sm text-gray-400 mt-0.5">Educational background, results, attendance & payments</p>
                </div>
            </div>

            {/* Quick Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <StatBox icon={Award} label="Total Exams" value={examData?.summary?.total_exams || 0} sub={`Avg GPA: ${examData?.summary?.average_gpa || 0}`} subColor="text-purple-500" onClick={() => navigate(`/admin/students/${id}/exam-results`)} />
                <StatBox icon={GraduationCap} label="Attendance Rate" value={attendanceData?.summary?.percentage ? `${attendanceData.summary.percentage}%` : '0%'} sub={`${attendanceData?.summary?.present || 0}/${attendanceData?.summary?.total_classes || 0} classes`} subColor="text-green-500" onClick={() => navigate(`/admin/students/${id}/attendance`)} />
                <StatBox icon={BookOpen} label="Total Paid" value={`৳${paymentData?.total_paid || 0}`} sub={`Due: ৳${paymentData?.total_due || 0}`} subColor="text-red-500" onClick={() => navigate(`/admin/students/${id}/payment-history`)} />
                <StatBox icon={Calendar} label="Admission" value={prof.admission_date || 'N/A'} sub={`${paymentData?.due_months?.length || 0} months due`} subColor="text-orange-500" />
            </div>

            {/* Educational Background + Guardian */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                    <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center gap-2.5">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center"><School size={16} className="text-[#1F4E79]" /></div>
                        <h3 className="text-sm md:text-base font-bold text-gray-900">Educational Background</h3>
                    </div>
                    <div className="px-6 md:px-7 py-5 md:py-6 space-y-4">
                        <DetailRow label="Last School" value={prof.last_school || 'N/A'} />
                        <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">SSC GPA</span>
                            <span className={`font-bold text-sm ${gpaColor(prof.ssc_gpa)}`}>{prof.ssc_gpa || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">JSC GPA</span>
                            <span className={`font-bold text-sm ${gpaColor(prof.jsc_gpa)}`}>{prof.jsc_gpa || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                    <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center gap-2.5">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center"><User size={16} className="text-[#1F4E79]" /></div>
                        <h3 className="text-sm md:text-base font-bold text-gray-900">Personal & Guardian</h3>
                    </div>
                    <div className="px-6 md:px-7 py-5 md:py-6 space-y-0 divide-y divide-gray-50">
                        <DetailRow label="Father" value={prof.father_name || 'N/A'} />
                        <DetailRow label="Father Mobile" value={prof.father_phone || 'N/A'} />
                        <DetailRow label="Mother" value={prof.mother_name || 'N/A'} />
                        <DetailRow label="Mother Mobile" value={prof.mother_phone || 'N/A'} />
                        <DetailRow label="Date of Birth" value={prof.dob || 'N/A'} />
                        <DetailRow label="Gender" value={prof.gender || 'N/A'} />
                        <DetailRow label="Blood Group" value={prof.blood_group || 'N/A'} />
                        <DetailRow label="Religion" value={prof.religion || 'N/A'} />
                    </div>
                </div>
            </div>

            {/* Recent Exam Results */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center"><BarChart3 size={16} className="text-[#1F4E79]" /></div>
                        <h3 className="text-sm md:text-base font-bold text-gray-900">Recent Exam Results</h3>
                    </div>
                    <button onClick={() => navigate(`/admin/students/${id}/exam-results`)} className="text-xs font-semibold text-[#1F4E79] hover:underline">View All →</button>
                </div>
                {examData && examData.results?.length > 0 ? (
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
                                        <td className="p-4 text-center font-bold">{result.total_obtained}/{result.exam?.total_marks || 0}</td>
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

            {/* Monthly Attendance */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center"><GraduationCap size={16} className="text-[#1F4E79]" /></div>
                        <h3 className="text-sm md:text-base font-bold text-gray-900">Monthly Attendance</h3>
                    </div>
                    <button onClick={() => navigate(`/admin/students/${id}/attendance`)} className="text-xs font-semibold text-[#1F4E79] hover:underline">View All →</button>
                </div>
                {attendanceData && Object.keys(attendanceData.monthly_stats || {}).length > 0 ? (
                    <div className="px-6 md:px-7 py-5 md:py-6 space-y-4">
                        {Object.entries(attendanceData.monthly_stats).slice(0, 6).map(([month, stats]) => {
                            const barColor = stats.percentage >= 75
                                ? 'from-emerald-400 to-emerald-600'
                                : stats.percentage >= 50
                                    ? 'from-amber-400 to-amber-600'
                                    : 'from-rose-400 to-rose-600';
                            const statusLabel = stats.percentage >= 75 ? 'Good'
                                : stats.percentage >= 50 ? 'Average' : 'Low';
                            const statusColor = stats.percentage >= 75
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : stats.percentage >= 50
                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                    : 'bg-rose-100 text-rose-700 border-rose-200';
                            return (
                                <div key={month}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-800">{month}</span>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{stats.percentage}%</span>
                                    </div>
                                    <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
                                            style={{ width: `${stats.percentage}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                                            <span className="text-[11px] font-bold text-white drop-shadow-sm" style={{ opacity: stats.percentage > 15 ? 1 : 0 }}>
                                                {stats.present}/{stats.total}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400">
                        <GraduationCap size={36} className="mx-auto mb-2 opacity-30" />
                        <p>No attendance records yet</p>
                    </div>
                )}
            </div>

            {/* Payment Overview */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center"><BookOpen size={16} className="text-[#1F4E79]" /></div>
                        <h3 className="text-sm md:text-base font-bold text-gray-900">Payment Overview</h3>
                    </div>
                    <button onClick={() => navigate(`/admin/students/${id}/payment-history`)} className="text-xs font-semibold text-[#1F4E79] hover:underline">View All →</button>
                </div>
                {paymentData ? (
                    <div className="px-6 md:px-7 py-5 md:py-6">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                                <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wider">Total Paid</p>
                                <p className="text-lg font-bold text-green-700 mt-1">৳{paymentData.total_paid}</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
                                <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Total Due</p>
                                <p className="text-lg font-bold text-red-700 mt-1">৳{paymentData.total_due}</p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Monthly Fee</p>
                                <p className="text-lg font-bold text-blue-700 mt-1">৳{paymentData.course_fee}</p>
                            </div>
                        </div>
                        {paymentData.due_months?.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-red-600 mb-2">Unpaid Months ({paymentData.due_months.length})</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {paymentData.due_months.map(month => (
                                        <span key={month} className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-200">{month}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400">
                        <BookOpen size={36} className="mx-auto mb-2 opacity-30" />
                        <p>No payment data yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-medium text-gray-800">{value || 'N/A'}</span>
        </div>
    );
}

function StatBox({ icon: Icon, label, value, sub, subColor, onClick }) {
    return (
        <div className={`bg-white rounded-2xl border border-gray-100 p-5 md:p-6 text-center transition-all duration-300 hover:shadow-lg hover:border-gray-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
            onClick={onClick}>
            <div className="w-10 h-10 rounded-xl bg-[#F0F4F8] flex items-center justify-center mx-auto mb-3">
                <Icon size={18} className="text-[#1F4E79]" />
            </div>
            <p className="text-xl md:text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
            {sub && <p className={`text-[11px] font-medium mt-1 ${subColor || 'text-gray-400'}`}>{sub}</p>}
        </div>
    );
}
