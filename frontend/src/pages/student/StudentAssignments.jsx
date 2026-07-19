import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { useNotificationCounts } from "../../context/NotificationContext";
import { Calendar, Award, FileText, Download, CheckCircle, Clock, Upload, ChevronDown, ChevronUp } from "lucide-react";
import notify from "../../services/notification";
import logger from '../../services/logger';

const statusIcon = {
    submitted: <Clock size={14} className="text-blue-500" />,
    reviewed: <CheckCircle size={14} className="text-green-500" />,
};

const statusLabel = {
    submitted: "Submitted (Pending Review)",
    reviewed: "Reviewed",
};

export default function StudentAssignments() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedTeacher, setExpandedTeacher] = useState(null);
    const [submitting, setSubmitting] = useState(null);
    const { markViewed } = useNotificationCounts();

    useEffect(() => {
        fetchAssignments();
        markViewed('assignments');
    }, []);

    const fetchAssignments = async () => {
        try {
            const { data } = await api.get("/student/assignments");
            setGroups(data);
        } catch (err) {
            logger.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (assignmentId, file) => {
        if (!file) return;
        setSubmitting(assignmentId);
        try {
            const fd = new FormData();
            fd.append("submission_file", file);
            await api.post(`/student/assignments/${assignmentId}/submit`, fd);
            await fetchAssignments();
        } catch (err) {
            notify.error(err.response?.data?.message || "Submission failed");
        } finally {
            setSubmitting(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1F4E79]" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold text-[#1F4E79]">Assignments</h1>
                <p className="text-xs text-gray-500">View and submit assignments from your teachers</p>
            </div>

            {groups.length === 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-10 text-center">
                    <FileText className="mx-auto text-gray-300 mb-3" size={40} />
                    <p className="text-sm text-gray-500">No assignments posted yet</p>
                </div>
            )}

            {groups.map((group) => {
                const t = group.teacher;
                const isExpanded = expandedTeacher === t.id;

                return (
                    <div key={t.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => setExpandedTeacher(isExpanded ? null : t.id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                        >
                            {t.profile_photo_url ? (
                                <img src={buildAssetUrl(t.profile_photo_url)} alt={t.name} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                            ) : (
                                <div className="h-9 w-9 rounded-full bg-[#1F4E79] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {t.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-gray-800">{t.name}</h3>
                                <p className="text-xs text-gray-500 truncate">
                                    {[t.designation, t.subject].filter(Boolean).join(" · ") || "Teacher"}
                                </p>
                            </div>
                            <span className="text-xs font-medium text-[#1F4E79] flex-shrink-0">{group.assignments.length}</span>
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                        </button>

                        {isExpanded && (
                            <div className="border-t border-gray-100 divide-y divide-gray-100">
                                {group.assignments.map((a) => {
                                    const s = a.submission;
                                    const isSubmitting = submitting === a.id;

                                    return (
                                        <div key={a.id} className="p-3 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-sm text-gray-800">{a.title}</h4>
                                                    {a.description && (
                                                        <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                                                    )}
                                                </div>
                                                {a.attachment_path && (
                                                    <a
                                                        href={buildAssetUrl(a.attachment_path)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1 text-xs text-[#1F4E79] hover:underline whitespace-nowrap flex-shrink-0"
                                                    >
                                                        <Download size={12} /> Attach
                                                    </a>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} /> Due: {new Date(a.due_date).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Award size={12} /> {a.total_marks} Marks
                                                </span>
                                                {a.subject && (
                                                    <span className="flex items-center gap-1">
                                                        <FileText size={12} /> {a.subject}
                                                    </span>
                                                )}
                                            </div>

                                            {s ? (
                                                <div className="p-2 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center gap-1.5 text-xs font-medium">
                                                        {statusIcon[s.status] || null}
                                                        <span>{statusLabel[s.status] || s.status}</span>
                                                    </div>
                                                    {s.marks_obtained !== null && (
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            Marks: <strong>{s.marks_obtained}</strong> / {a.total_marks}
                                                        </p>
                                                    )}
                                                    {s.feedback && (
                                                        <p className="text-xs text-gray-600 mt-1">Feedback: {s.feedback}</p>
                                                    )}
                                                    {s.submission_file_path && (
                                                        <a
                                                            href={buildAssetUrl(s.submission_file_path)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs text-[#1F4E79] hover:underline mt-1"
                                                        >
                                                            <FileText size={12} /> View Submission
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <SubmissionForm
                                                    assignmentId={a.id}
                                                    submitting={isSubmitting}
                                                    onSubmit={handleSubmit}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function SubmissionForm({ assignmentId, submitting, onSubmit }) {
    const [file, setFile] = useState(null);

    return (
        <div className="flex items-center gap-2">
            <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#1F4E79]/10 file:text-[#1F4E79] hover:file:bg-[#1F4E79]/20 file:cursor-pointer"
            />
            <button
                onClick={() => onSubmit(assignmentId, file)}
                disabled={!file || submitting}
                className="inline-flex items-center gap-1 px-3 py-1 bg-[#1F4E79] text-white text-xs rounded-lg hover:bg-[#1a3d66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {submitting ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                ) : (
                    <Upload size={12} />
                )}
                {submitting ? "Submitting..." : "Submit"}
            </button>
        </div>
    );
}
