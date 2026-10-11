import { useEffect, useState } from "react";
import api from "../../services/api";
import { BookOpen, Users, Clock, Video } from "lucide-react";
import logger from '../../services/logger';

export default function TeacherBatches() {
    const [batchGroups, setBatchGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            const { data } = await api.get('/teacher/batches');
            const groups = [];
            const byId = new Map();
            (data || []).forEach((assignment) => {
                let group = byId.get(assignment.batch_id);
                if (!group) {
                    group = {
                        key: assignment.batch_id,
                        batch_id: assignment.batch_id,
                        name: assignment.name,
                        course: assignment.course,
                        start_time: assignment.start_time,
                        end_time: assignment.end_time,
                        class_link: assignment.class_link || null,
                        student_count: assignment.student_count || 0,
                        subjects: [],
                    };
                    byId.set(assignment.batch_id, group);
                    groups.push(group);
                }
                if (assignment.subject && !group.subjects.includes(assignment.subject)) {
                    group.subjects.push(assignment.subject);
                }
            });
            setBatchGroups(groups);
        } catch (error) {
            logger.error('Failed to fetch batches:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">My Batches</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batchGroups.map((batch) => (
                    <div key={batch.key} className="bg-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-[#1F4E79]/10 rounded-lg">
                                <BookOpen className="text-[#1F4E79]" size={24} />
                            </div>
                            <div className="flex flex-wrap gap-1.5 justify-end">
                                {batch.subjects.map((subject) => (
                                    <span key={subject} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                        {subject}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">{batch.name}</h3>
                        <p className="text-sm text-gray-600 mb-4">{batch.course?.title}</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users size={16} />
                                <span>{batch.student_count} Students</span>
                            </div>
                            {batch.start_time && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock size={16} />
                                    <span>{batch.start_time} - {batch.end_time}</span>
                                </div>
                            )}
                        </div>
                        {batch.class_link && (
                            <a href={batch.class_link} target="_blank" rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F4E79] text-white text-xs font-bold hover:bg-[#163859] transition shadow">
                                <Video size={14} /> Join Class
                            </a>
                        )}
                    </div>
                ))}
            </div>

            {batchGroups.length === 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
                    <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-500">No batches assigned yet</p>
                </div>
            )}
        </div>
    );
}
