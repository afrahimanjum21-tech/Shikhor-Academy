import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, Edit, Save, Upload, User, Award, ClipboardCheck, CreditCard, BookOpen } from "lucide-react";

const tabs = [
    { name: 'Profile', path: 'profile', icon: <User size={16} /> },
    { name: 'Academic History', path: 'academic-history', icon: <BookOpen size={16} /> },
    { name: 'Exam Results', path: 'exam-results', icon: <Award size={16} /> },
    { name: 'Attendance', path: 'attendance', icon: <ClipboardCheck size={16} /> },
    { name: 'Payments', path: 'payment-history', icon: <CreditCard size={16} /> },
];

export default function StudentDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [student, setStudent] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [formData, setFormData] = useState({});
    const [photoFile, setPhotoFile] = useState(null);
    const [timestamp, setTimestamp] = useState(Date.now());

    // Determine which tab is active
    const currentPath = location.pathname;
    const activeTab = tabs.find(t => currentPath.endsWith(t.path))?.path || 'profile';

    // Load student data always
    useEffect(() => {
        const loadData = async () => {
            try {
                const studentRes = await api.get(`/admin/student/${id}`);
                setStudent(studentRes.data);

                try {
                    const [batchRes, courseRes] = await Promise.all([
                        api.get('/admin/batches'),
                        api.get('/admin/courses')
                    ]);
                    setBatches(batchRes.data);
                    setCourses(courseRes.data);
                } catch (e) { console.log("Batch/Course fetch error", e); }

                const prof = studentRes.data.student_profile || {};
                setFormData({
                    name: studentRes.data.name || '',
                    email: studentRes.data.email || '',
                    phone: studentRes.data.phone || '',
                    password: '',
                    student_id_card_no: prof.student_id_card_no || '',
                    current_batch_id: prof.current_batch_id || '',
                    // 🔥 ফিক্স: প্রোফাইল ট্যাবে "Not Assigned" না দেখানোর জন্য
                    // batch ও course এর নাম formData-তে রাখা হচ্ছে
                    batch_name: prof.batch?.name || '',
                    course_name: prof.batch?.course?.title || prof.admission?.course?.title || '',
                    course_id: prof.batch?.course_id || prof.admission?.course_id || '',
                    guardian_phone: prof.guardian_phone || '',
                    father_name: prof.father_name || '',
                    father_mobile: prof.father_mobile || '',
                    father_occupation: prof.father_occupation || '',
                    mother_name: prof.mother_name || '',
                    mother_mobile: prof.mother_mobile || '',
                    mother_occupation: prof.mother_occupation || '',
                    gender: prof.gender || '',
                    blood_group: prof.blood_group || '',
                    religion: prof.religion || '',
                    dob: prof.dob || '',
                    nationality: prof.nationality || 'Bangladeshi',
                    present_address: prof.present_address || '',
                    permanent_address: prof.permanent_address || '',
                    last_school: prof.last_school || '',
                    ssc_gpa: prof.ssc_gpa || '',
                    jsc_gpa: prof.jsc_gpa || '',
                });
            } catch (err) {
                console.error(err);
                alert("Error loading student data.");
                navigate('/admin/students');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id, navigate]);

    const handleUpdate = async () => {
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if(formData[key] !== null && formData[key] !== undefined) {
                data.append(key, formData[key]);
            }
        });

        if(photoFile) data.append('photo', photoFile);
        data.append('_method', 'PUT');

        try {
            await api.post(`/admin/student/${id}`, data, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            alert("Updated Successfully!");
            setIsEditing(false);
            setPhotoFile(null);
            setTimestamp(Date.now());
            const res = await api.get(`/admin/student/${id}`);
            setStudent(res.data);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Failed to update");
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!student) return <div className="p-10 text-center">Student not found</div>;

    const rawPhotoPath = student.profile_photo_url || student.profile_photo_path || student.student_profile?.admission?.photo_path;
    const photoUrl = rawPhotoPath
        ? `${rawPhotoPath.startsWith('http') ? rawPhotoPath : `http://localhost:8000/${rawPhotoPath}`}?t=${timestamp}`
        : null;

    const prof = student.student_profile || {};

    return (
        <div className="max-w-6xl mx-auto space-y-4 pb-10 px-4">
            {/* Header with Back Button */}
            <div className="flex justify-between items-center bg-white p-4 rounded shadow-sm border border-gray-200">
                <button onClick={() => navigate('/admin/students')} className="flex items-center gap-2 text-gray-600 hover:text-[#1F4E79] font-bold">
                    <ArrowLeft size={20}/> Back to Students
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#1F4E79] text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {student.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">{student.name}</h1>
                        <p className="text-xs text-gray-500">ID: {formData.student_id_card_no}</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex flex-wrap gap-1">
                {tabs.map(tab => (
                    <Link
                        key={tab.path}
                        to={`/admin/students/${id}/${tab.path}`}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-bold transition-all duration-200 ${
                            activeTab === tab.path
                                ? 'bg-[#1F4E79] text-white shadow-sm'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-[#1F4E79]'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.name}</span>
                    </Link>
                ))}
            </div>

            {/* Render sub-pages via Outlet */}
            <Outlet context={{ student, formData, isEditing, setIsEditing, photoFile, setPhotoFile, photoUrl, timestamp, batches, courses, handleUpdate, handleChange, setFormData, prof }} />
        </div>
    );
}
