import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { Calendar, Check, X, Clock, AlertCircle } from "lucide-react";
import notify from "../../services/notification";
import logger from '../../services/logger';

export default function TeacherAttendance() {
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [students, setStudents] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [session, setSession] = useState('morning');
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            const { data } = await api.get('/teacher/batches');
            const unique = [];
            const seen = new Set();
            (data || []).forEach((assignment) => {
                if (!seen.has(assignment.batch_id)) {
                    seen.add(assignment.batch_id);
                    unique.push(assignment);
                }
            });
            setBatches(unique);
        } catch (error) {
            logger.error('Failed to fetch batches:', error);
        }
    };

    const fetchStudents = async (batchId, attDate, attSession) => {
        try {
            setLoading(true);
            const { data } = await api.get(
                `/teacher/attendance/students/${batchId}?date=${attDate}&session=${attSession}`
            );
            setStudents(data.students || []);
            const initialAttendance = {};
            (data.students || []).forEach(entry => {
                initialAttendance[entry.student.id] = entry.attendance?.status || 'present';
            });
            setAttendance(initialAttendance);
        } catch (error) {
            logger.error('Failed to fetch students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBatchChange = (batchId) => {
        setSelectedBatch(batchId);
        if (batchId) {
            fetchStudents(batchId, date, session);
        }
    };

    const handleDateChange = (value) => {
        setDate(value);
        if (selectedBatch) {
            fetchStudents(selectedBatch, value, session);
        }
    };

    const handleSessionChange = (value) => {
        setSession(value);
        if (selectedBatch) {
            fetchStudents(selectedBatch, date, value);
        }
    };

    const markAttendance = async () => {
        if (!selectedBatch) return;

        const attendanceData = Object.keys(attendance).map(studentId => ({
            student_id: parseInt(studentId),
            status: attendance[studentId]
        }));

        try {
            await api.post('/teacher/attendance/mark', {
                batch_id: selectedBatch,
                date,
                session,
                records: attendanceData
            });
            notify.success('Attendance marked successfully');
        } catch (error) {
            logger.error('Failed to mark attendance:', error);
            notify.error('Failed to mark attendance');
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Attendance Management</h1>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch</label>
                        <select
                            value={selectedBatch || ''}
                            onChange={(e) => handleBatchChange(parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                        >
                            <option value="">Select a batch</option>
                             {batches.map((assignment) => (
                                 <option key={assignment.batch_id} value={assignment.batch_id}>
                                     {assignment.name}
                                 </option>
                             ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                        <select
                            value={session}
                            onChange={(e) => handleSessionChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                        >
                            <option value="morning">Morning</option>
                            <option value="evening">Evening</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Students List */}
            {selectedBatch && students.length > 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Mark Attendance</h2>
                        <button
                            onClick={markAttendance}
                            className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors"
                        >
                            Save Attendance
                        </button>
                    </div>

                    <div className="space-y-3">
                        {students.map((entry) => {
                            const student = entry.student;
                            return (
                                <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-[#1F4E79] flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                                            {student.User?.profile_photo_path ? (
                                                <img src={buildAssetUrl(student.User.profile_photo_path)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                student.User?.name?.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{student.User?.name}</p>
                                            <p className="text-sm text-gray-500">ID: {student.student_id_card_no}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {['present', 'absent', 'late', 'leave'].map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => setAttendance({ ...attendance, [student.id]: status })}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                    attendance[student.id] === status
                                                        ? status === 'present'
                                                            ? 'bg-green-500 text-white'
                                                            : status === 'absent'
                                                            ? 'bg-red-500 text-white'
                                                            : status === 'late'
                                                            ? 'bg-yellow-500 text-white'
                                                            : 'bg-blue-500 text-white'
                                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                }`}
                                            >
                                                {status === 'present' && <Check size={16} />}
                                                {status === 'absent' && <X size={16} />}
                                                {status === 'late' && <Clock size={16} />}
                                                {status === 'leave' && <AlertCircle size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
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
