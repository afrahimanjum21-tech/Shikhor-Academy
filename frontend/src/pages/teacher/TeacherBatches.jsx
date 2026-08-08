import { useEffect, useState } from "react";
import api from "../../services/api";
import { BookOpen, Users, Clock } from "lucide-react";
import logger from '../../services/logger';

export default function TeacherBatches() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            const { data } = await api.get('/teacher/batches');
            setBatches(data);
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
                {batches.map((assignment) => (
                    <div key={assignment.id} className="bg-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-[#1F4E79]/10 rounded-lg">
                                <BookOpen className="text-[#1F4E79]" size={24} />
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                {assignment.subject}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">{assignment.name}</h3>
                        <p className="text-sm text-gray-600 mb-4">{assignment.course?.title}</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users size={16} />
                                <span>{assignment.student_count || 0} Students</span>
                            </div>
                            {assignment.start_time && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock size={16} />
                                    <span>{assignment.start_time} - {assignment.end_time}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {batches.length === 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
                    <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-500">No batches assigned yet</p>
                </div>
            )}
        </div>
    );
}
