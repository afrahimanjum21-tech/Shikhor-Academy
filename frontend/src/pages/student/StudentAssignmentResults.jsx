import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import logger from "../../services/logger";
import { useNotificationCounts } from "../../context/NotificationContext";
import { Award, FileText, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";

const statusIcon = {
    submitted: <Clock size={14} className="text-blue-500" />,
    reviewed: <CheckCircle size={14} className="text-green-500" />,
    graded: <CheckCircle size={14} className="text-green-500" />,
};

const statusLabel = {
    submitted: "Pending Review",
    reviewed: "Reviewed",
    graded: "Reviewed",
};

export default function StudentAssignmentResults() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedTeacher, setExpandedTeacher] = useState(null);
    const { markViewed } = useNotificationCounts();

    useEffect(() => {
        api.get("/student/assignment-results")
            .then(({ data }) => setGroups(data))
            .catch(err => logger.error(err))
            .finally(() => setLoading(false));
        markViewed('results');
    }, []);

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
                <h1 className="text-xl font-bold text-[#1F4E79]">Assignment Results</h1>
                <p className="text-xs text-gray-500">Your marks, feedback, and submission status grouped by teacher</p>
            </div>

            {groups.length === 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-10 text-center">
                    <FileText className="mx-auto text-gray-300 mb-3" size={40} />
                    <p className="text-sm text-gray-500">No assignment submissions yet</p>
                </div>
            )}

            {groups.map((group) => {
                const t = group.teacher;
                const isExpanded = expandedTeacher === t.id;

                return (
                    <div key={t.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                        {/* Teacher Header */}
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
                            <span className="text-xs font-medium text-[#1F4E79] flex-shrink-0">{group.results.length}</span>
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                        </button>

                        {/* Results */}
                        {isExpanded && (
                            <div className="border-t border-gray-100 divide-y divide-gray-100">
                                {group.results.map((r) => (
                                    <div key={r.id} className="p-3 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-sm text-gray-800">{r.title}</h4>
                                                {r.subject && (
                                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                        <FileText size={12} /> {r.subject}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {statusIcon[r.status] || null}
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                    r.status === "reviewed" || r.status === "graded" ? "bg-green-100 text-green-700" :
                                                    r.status === "submitted" ? "bg-blue-100 text-blue-700" :
                                                    "bg-gray-100 text-gray-600"
                                                }`}>
                                                    {statusLabel[r.status] || r.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            {r.marks_obtained !== null ? (
                                                <span className="flex items-center gap-1 font-semibold text-gray-800">
                                                    <Award size={14} className="text-[#1F4E79]" />
                                                    Marks: <span className="text-[#1F4E79]">{r.marks_obtained}</span> / {r.total_marks}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-gray-400">
                                                    <Award size={14} />
                                                    Awaiting grading
                                                </span>
                                            )}
                                            {r.submitted_at && (
                                                <span className="text-xs text-gray-400">
                                                    Submitted: {new Date(r.submitted_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>

                                        {r.feedback && (
                                            <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-700">
                                                <span className="font-medium text-gray-800">Feedback: </span>
                                                {r.feedback}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
