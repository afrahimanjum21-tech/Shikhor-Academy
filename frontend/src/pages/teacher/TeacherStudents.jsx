import { useEffect, useState } from "react";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { Users, Search, Phone, User } from "lucide-react";
import logger from '../../services/logger';

export default function TeacherStudents() {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const { data } = await api.get('/teacher/students');
            setStudents(data);
        } catch (error) {
            logger.error('Failed to fetch students:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(student => {
        const searchLower = searchTerm.toLowerCase();
        return (
            student.user?.name?.toLowerCase().includes(searchLower) ||
            student.student_id_card_no?.toLowerCase().includes(searchLower) ||
            student.roll?.toLowerCase().includes(searchLower)
        );
    });

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">My Students</h1>
            
            {/* Search */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, student ID, or roll..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent"
                    />
                </div>
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => (
                    <div key={student.id} className="bg-white rounded-xl shadow border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-full bg-[#1F4E79] flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                                {student.user?.profile_photo_url ? (
                                    <img src={buildAssetUrl(student.user.profile_photo_url)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    student.user?.name?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800">{student.user?.name}</h3>
                                <p className="text-sm text-gray-500">ID: {student.student_id_card_no}</p>
                                {student.roll && <p className="text-sm text-gray-500">Roll: {student.roll}</p>}
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users size={16} />
                                <span>{student.batch?.name}</span>
                            </div>
                            {student.guardian_phone && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone size={16} />
                                    <span>{student.guardian_phone}</span>
                                </div>
                            )}
                            {student.father_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <User size={16} />
                                    <span>Guardian: {student.father_name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredStudents.length === 0 && (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
                    <Users className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-500">No students found</p>
                </div>
            )}
        </div>
    );
}
