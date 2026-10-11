import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { useNotificationCounts } from "../../context/NotificationContext";
import { FileText, Plus, Edit, Trash2, Calendar, Award, Users, CheckCircle } from "lucide-react";
import notify from "../../services/notification";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';

export default function TeacherAssignments() {
    const confirm = useConfirm();
    const [assignments, setAssignments] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', batch_id: '', subject: '', due_date: '', total_marks: 100, attachment: null });
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gradingData, setGradingData] = useState({});
    const { markViewed } = useNotificationCounts();

    useEffect(() => {
        fetchAssignments();
        fetchBatches();
        markViewed('reviews');
    }, []);

    const fetchAssignments = async () => {
        try {
            const { data } = await api.get('/teacher/assignments');
            setAssignments(data);
        } catch (error) {
            logger.error('Failed to fetch assignments:', error);
        }
    };

    const fetchBatches = async () => {
        try {
            const { data } = await api.get('/teacher/batches');
            setBatches(data);
        } catch (error) {
            logger.error('Failed to fetch batches:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('batch_id', formData.batch_id);
        data.append('subject', formData.subject);
        data.append('due_date', formData.due_date);
        data.append('total_marks', formData.total_marks);
        if (formData.attachment) {
            data.append('attachment', formData.attachment);
        }

        try {
            if (editingAssignment) {
                await api.put(`/teacher/assignments/${editingAssignment.id}`, data);
            } else {
                await api.post('/teacher/assignments', data);
            }
            await fetchAssignments();
            setShowCreate(false);
            setEditingAssignment(null);
            setFormData({ title: '', description: '', batch_id: '', subject: '', due_date: '', total_marks: 100, attachment: null });
        } catch (error) {
            const msg = error.response?.data?.message || error.response?.data?.errors?.[Object.keys(error.response?.data?.errors || {})[0]]?.[0] || 'Failed to save assignment';
            notify.error(msg);
        }
    };

    const handleEdit = (assignment) => {
        setEditingAssignment(assignment);
        setFormData({
            title: assignment.title,
            description: assignment.description,
            batch_id: assignment.batch_id,
            subject: assignment.subject,
            due_date: assignment.due_date,
            total_marks: assignment.total_marks,
            attachment: null
        });
        setShowCreate(true);
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ title: "Delete Assignment?", message: "Are you sure you want to delete this assignment?", confirmText: "Delete", variant: "destructive" }); if (ok) {
            try {
                await api.delete(`/teacher/assignments/${id}`);
                await fetchAssignments();
            } catch (error) {
                logger.error('Failed to delete assignment:', error);
                notify.error('Failed to delete assignment');
            }
        }
    };

    const handleGrade = async (submissionId, marks, feedback) => {
        const numeric = parseFloat(marks);
        if (!Number.isFinite(numeric) || numeric < 0) {
            notify.error('Marks cannot be empty or negative');
            return;
        }
        if (numeric > selectedAssignment.total_marks) {
            notify.error(`Marks cannot exceed ${selectedAssignment.total_marks}`);
            return;
        }
        try {
            await api.post(`/teacher/assignments/submissions/${submissionId}/grade`, {
                marks_obtained: numeric,
                feedback
            });
            await fetchAssignmentDetails(selectedAssignment.id);
            setGradingData({});
        } catch (error) {
            logger.error('Failed to grade submission:', error);
            notify.error('Failed to grade submission');
        }
    };

    const fetchAssignmentDetails = async (assignmentId) => {
        try {
            const { data } = await api.get(`/teacher/assignments/${assignmentId}`);
            setSelectedAssignment(data);
        } catch (error) {
            logger.error('Failed to fetch assignment details:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>
                <button
                    onClick={() => { setShowCreate(true); setEditingAssignment(null); setFormData({ title: '', description: '', batch_id: '', subject: '', due_date: '', total_marks: 100, attachment: null }); }}
                    className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors flex items-center gap-2"
                >
                    <Plus size={16} /> Create Assignment
                </button>
            </div>

            {/* Create/Edit Modal */}
            {showCreate && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">
                        {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                                <select
                                    value={formData.batch_id}
                                    onChange={(e) => {
                                        const batch = batches.find((b) => String(b.batch_id) === String(e.target.value));
                                        setFormData({ ...formData, batch_id: e.target.value, subject: batch?.subject || '' });
                                    }}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                >
                                    <option value="">Select a batch</option>
                                    {batches
                                        .filter((batch, index, self) => self.findIndex((b) => b.batch_id === batch.batch_id) === index)
                                        .map((batch) => (
                                            <option key={batch.id} value={batch.batch_id}>
                                                {batch.name} - {batch.subject}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    readOnly
                                    placeholder="Select a batch to auto-fill subject"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                                <input
                                    type="number"
                                    value={formData.total_marks}
                                    onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) || 0 })}
                                    required
                                    min="0"
                                    max="1000"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Optional)</label>
                            <input
                                type="file"
                                onChange={(e) => setFormData({ ...formData, attachment: e.target.files[0] })}
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="px-4 py-2 bg-[#1F4E79] text-white rounded-lg hover:bg-[#1a3d66] transition-colors">
                                {editingAssignment ? 'Update' : 'Create'}
                            </button>
                            <button type="button" onClick={() => { setShowCreate(false); setEditingAssignment(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Assignments List */}
            {!selectedAssignment ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignments.map((assignment) => (
                        <div key={assignment.id} className="bg-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => fetchAssignmentDetails(assignment.id)}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-[#1F4E79]/10 rounded-lg">
                                    <FileText className="text-[#1F4E79]" size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(assignment); }} className="p-1 text-gray-500 hover:text-[#1F4E79] transition-colors">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(assignment.id); }} className="p-1 text-gray-500 hover:text-red-600 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-800 mb-2">{assignment.title}</h3>
                            <p className="text-sm text-gray-600 mb-4">{assignment.description}</p>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar size={16} />
                                    <span>Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Award size={16} />
                                    <span>{assignment.total_marks} Marks</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Users size={16} />
                                    <span>{assignment.submission_count || 0} Submissions</span>
                                </div>
                                {assignment.Teacher && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 pt-1 border-t border-gray-100">
                                        <span>Created by <strong>{assignment.Teacher?.name}</strong></span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Assignment Details */
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <button onClick={() => setSelectedAssignment(null)} className="mb-4 text-[#1F4E79] hover:underline">
                        ← Back to Assignments
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 mb-4">{selectedAssignment.title}</h2>
                    <div className="mb-6 space-y-2">
                        <p className="text-gray-600">{selectedAssignment.description}</p>
                        <div className="flex gap-4 text-sm text-gray-600">
                            <span><Calendar size={16} className="inline mr-1" /> Due: {selectedAssignment.due_date ? new Date(selectedAssignment.due_date).toLocaleDateString() : 'N/A'}</span>
                            <span><Award size={16} className="inline mr-1" /> {selectedAssignment.total_marks} Marks</span>
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-4">Submissions</h3>
                    {selectedAssignment.AssignmentSubmissions?.length > 0 ? (
                        <div className="space-y-4">
                            {selectedAssignment.AssignmentSubmissions?.map((submission) => (
                                <div key={submission.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-[#1F4E79] flex items-center justify-center text-white font-bold">
                                                {submission.Student?.User?.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">{submission.Student?.User?.name}</p>
                                                <p className="text-xs text-gray-500">ID: {submission.Student?.student_id_card_no}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            submission.status === 'reviewed' || submission.status === 'graded' ? 'bg-green-100 text-green-700' :
                                            submission.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {submission.status}
                                        </span>
                                    </div>
                                    {submission.status === 'submitted' || submission.status === 'reviewed' || submission.status === 'graded' ? (
                                        <div className="mt-4 space-y-3">
                                            {submission.submission_file_path && (
                                                <a href={buildAssetUrl(submission.submission_file_path)} target="_blank" rel="noopener noreferrer" className="text-[#1F4E79] hover:underline text-sm">
                                                    View Submission File
                                                </a>
                                            )}
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="number"
                                                    placeholder="Marks"
                                                    value={gradingData[submission.id]?.marks ?? submission.marks_obtained ?? ''}
                                                    onChange={(e) => setGradingData({ ...gradingData, [submission.id]: { ...gradingData[submission.id], marks: e.target.value } })}
                                                    max={selectedAssignment.total_marks}
                                                    className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Feedback"
                                                    value={gradingData[submission.id]?.feedback ?? submission.feedback ?? ''}
                                                    onChange={(e) => setGradingData({ ...gradingData, [submission.id]: { ...gradingData[submission.id], feedback: e.target.value } })}
                                                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const marks = gradingData[submission.id]?.marks ?? submission.marks_obtained ?? '';
                                                        const feedback = gradingData[submission.id]?.feedback ?? submission.feedback ?? '';
                                                        handleGrade(submission.id, marks, feedback);
                                                    }}
                                                    className="px-3 py-1 bg-[#1F4E79] text-white rounded hover:bg-[#1a3d66] transition-colors flex items-center gap-1"
                                                >
                                                    <CheckCircle size={16} /> Grade
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">Not submitted yet</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No submissions yet</p>
                    )}
                </div>
            )}

            {assignments.length === 0 && !selectedAssignment && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
                    <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-500">No assignments created yet</p>
                </div>
            )}
        </div>
    );
}
