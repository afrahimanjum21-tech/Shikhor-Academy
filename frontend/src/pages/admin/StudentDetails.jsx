import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import api from "../../services/api";
import { buildAssetUrl } from "../../services/config";
import { ArrowLeft, User, Award, ClipboardCheck, CreditCard, BookOpen, FileText, IdCard, Clock, BookMarked, Percent, BarChart3, CheckCircle, XCircle, Activity, GraduationCap, Hash, Building2, Users, Calendar } from "lucide-react";
import notify from "../../services/notification";
import logger from '../../services/logger';

const tabs = [
    { name: 'Profile', path: 'profile', icon: <User size={16} /> },
    { name: 'Academic History', path: 'academic-history', icon: <BookOpen size={16} /> },
    { name: 'Exam Results', path: 'exam-results', icon: <Award size={16} /> },
    { name: 'Attendance', path: 'attendance', icon: <ClipboardCheck size={16} /> },
    { name: 'Payments', path: 'payment-history', icon: <CreditCard size={16} /> },
    { name: 'Documents', path: 'documents', icon: <FileText size={16} /> },
];

function HeroBadge({ icon: Icon, children }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-[11px] md:text-xs font-medium border border-white/10 whitespace-nowrap">
            <Icon size={11} className="shrink-0" />
            {children}
        </span>
    );
}

function HeroStat({ label, value, icon: Icon }) {
    return (
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Icon size={14} className="text-white/80" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-medium text-white/60 uppercase tracking-wider">{label}</p>
                <p className="text-sm md:text-base font-bold text-white truncate">{value ?? "-"}</p>
            </div>
        </div>
    );
}

function Skeleton({ className = "" }) {
    return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />;
}

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
    const [saving, setSaving] = useState(false);

    const currentPath = location.pathname;
    const activeTab = tabs.find(t => currentPath.endsWith(t.path))?.path || 'profile';

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
                } catch (e) { notify.error("Failed to load batches and courses"); }

                const prof = studentRes.data.student_profile || {};
                setFormData({
                    name: studentRes.data.name || '',
                    email: studentRes.data.email || '',
                    phone: studentRes.data.phone || '',
                    password: '',
                    student_id_card_no: prof.student_id_card_no || '',
                    current_batch_id: prof.current_batch_id || '',
                    batch_name: prof.batch?.name || '',
                    course_name: prof.batch?.course?.title || prof.admission?.course?.title || '',
                    course_id: prof.batch?.course_id || prof.admission?.course_id || '',
                    guardian_phone: prof.guardian_phone || '',
                    emergency_contact_name: prof.emergency_contact_name || prof.emergency_name || '',
                    emergency_contact_phone: prof.emergency_contact_phone || prof.emergency_mobile || '',
                    emergency_contact_relation: prof.emergency_contact_relation || prof.emergency_relation || '',
                    father_name: prof.father_name || '',
                    father_phone: prof.father_phone || '',
                    father_occupation: prof.father_occupation || '',
                    mother_name: prof.mother_name || '',
                    mother_phone: prof.mother_phone || '',
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
                    shift: prof.shift || '',
                    section: prof.section || '',
                    group_name: prof.group_name || '',
                    subject: prof.subject || '',
                });
            } catch (err) {
                logger.error(err);
                notify.error("Error loading student data.");
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

        setSaving(true);
        try {
            await api.post(`/admin/student/${id}`, data, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            notify.success("Updated Successfully!");
            setIsEditing(false);
            setPhotoFile(null);
            setTimestamp(Date.now());
            const res = await api.get(`/admin/student/${id}`);
            setStudent(res.data);
        } catch (err) {
            logger.error(err);
            notify.error(err.response?.data?.message || "Failed to update");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    if (loading) return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            <div className="relative overflow-hidden rounded-[24px] min-h-[240px]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1F4E79] via-[#1a3f63] to-[#0f2d4a]" />
                <div className="relative z-10 p-6 md:p-8 space-y-4">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-20 h-20 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}
                    </div>
                </div>
            </div>
        </div>
    );

    if (!student) return <div className="p-10 text-center">Student not found</div>;

    const rawPhotoPath = student.profile_photo_url || student.profile_photo_path || student.student_profile?.admission?.photo_path;
    const photoUrl = rawPhotoPath
        ? `${buildAssetUrl(rawPhotoPath)}?t=${timestamp}`
        : null;

    const prof = student.student_profile || {};
    const batchName = prof.batch?.name || formData.batch_name || "Not Assigned";
    const courseName = prof.batch?.course?.title || prof.admission?.course?.title || formData.course_name || "Not Assigned";
    const shift = prof.shift || formData.shift || "-";
    const section = prof.section || formData.section || "-";
    const group = prof.group_name || formData.group_name || "-";
    const subject = prof.subject || formData.subject || "-";
    const admissionDate = prof.admission_date ? new Date(prof.admission_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A";

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10 px-4">
            {/* ========== HERO SECTION ========== */}
            <div className="relative overflow-hidden rounded-[24px] min-h-[240px] md:min-h-[260px]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1F4E79] via-[#1a3f63] to-[#0f2d4a]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.04)_0%,transparent_50%)]" />
                <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
                <div className="absolute bottom-[-40px] left-[20%] w-[200px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

                <div className="relative z-10 flex flex-col justify-between h-full min-h-[240px] md:min-h-[260px] p-5 md:p-7 lg:p-8 gap-4">
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                        <button onClick={() => navigate('/admin/students')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 transition text-xs font-medium border border-white/10">
                            <ArrowLeft size={14} /> Back to Students
                        </button>
                    </div>

                    {/* Profile header */}
                    <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
                        <div className="relative shrink-0">
                            <div className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] lg:w-[96px] lg:h-[96px] rounded-full ring-[3px] ring-white/80 shadow-xl overflow-hidden bg-gradient-to-br from-[#1F4E79] to-[#163859]">
                                {photoUrl ? (
                                    <img
                                        src={photoUrl}
                                        alt={student.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => { e.target.style.display = "none"; e.target.nextElementSibling?.classList.remove("hidden"); }}
                                    />
                                ) : null}
                                <div className={`w-full h-full flex items-center justify-center text-white text-2xl md:text-3xl lg:text-4xl font-bold ${photoUrl ? "hidden" : ""}`}>
                                    {student.name?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <span className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full ring-2 ring-white ${student.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        </div>

                        <div className="min-w-0 flex-1 pt-0.5">
                            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
                                {student.name}
                            </h1>
                            <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2.5 md:mt-3">
                                <HeroBadge icon={IdCard}>
                                    ID: {prof.student_id_card_no || "---"}
                                </HeroBadge>
                                <HeroBadge icon={BookOpen}>
                                    {courseName}
                                </HeroBadge>
                                <HeroBadge icon={Hash}>
                                    {batchName}
                                </HeroBadge>
                                <HeroBadge icon={Clock}>
                                    {shift}
                                </HeroBadge>
                                <HeroBadge icon={student.is_active ? CheckCircle : XCircle}>
                                    {student.is_active ? "Active" : "Inactive"}
                                </HeroBadge>
                                {prof.blood_group && (
                                    <HeroBadge icon={Activity}>
                                        {prof.blood_group}
                                    </HeroBadge>
                                )}
                                {section !== "-" && (
                                    <HeroBadge icon={Building2}>
                                        Sec {section}
                                    </HeroBadge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                        <HeroStat label="Admission" value={admissionDate} icon={Calendar} />
                        <HeroStat label="Section" value={section} icon={Building2} />
                        <HeroStat label="Group" value={group} icon={Users} />
                        <HeroStat label="Subject" value={subject} icon={BookMarked} />
                        <HeroStat label="Gender" value={prof.gender || "-"} icon={User} />
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1 flex flex-wrap gap-1">
                {tabs.map(tab => (
                    <Link
                        key={tab.path}
                        to={`/admin/students/${id}/${tab.path}`}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
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

            <Outlet context={{ student, formData, isEditing, setIsEditing, photoFile, setPhotoFile, photoUrl, timestamp, batches, courses, handleUpdate, handleChange, setFormData, prof, saving }} />
        </div>
    );
}
