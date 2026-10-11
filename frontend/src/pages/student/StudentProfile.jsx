import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { buildAssetUrl, buildAuthenticatedAssetUrl } from "../../services/config";
import api from "../../services/api";
import {
    User, Mail, Phone, MapPin, Calendar, GraduationCap, BookOpen,
    Shield, Award, Clock, FileText, Download, Eye,
    CheckCircle, XCircle, AlertCircle,
    Trophy, RefreshCw,
    Users, Activity, BarChart3,
    IdCard, Hash,
    Home, Building2,
    ChevronRight,
    Percent, CreditCard, BookMarked,
    Globe, Bell, Image, Printer, Video
} from "lucide-react";

function Skeleton({ className = "" }) {
    return <div className={`animate-pulse bg-gray-100 rounded-lg ${className}`} />;
}

function getRankLabel(gpa) {
    if (!gpa) return null;
    const g = parseFloat(gpa);
    if (g >= 4.8) return { label: "Top 1%", color: "text-emerald-400" };
    if (g >= 4.5) return { label: "Top 5%", color: "text-blue-300" };
    if (g >= 4.0) return { label: "Top 10%", color: "text-indigo-300" };
    if (g >= 3.5) return { label: "Top 25%", color: "text-amber-300" };
    if (g >= 3.0) return { label: "Good Standing", color: "text-teal-300" };
    return { label: "Active", color: "text-gray-300" };
}

// Map the various names an admin backend may use for a document's `type` to a
// small canonical set, so UI classification (e.g. "identity") isn't fragile
// when the stored `type` is an unconstrained string.
const ID_TYPE_ALIASES = new Set([
  "identity", "identity_card", "id_card", "idcard", "id",
  "student_id", "studentid", "studentidcard", "national_id", "nid",
]);
function canonicalDocumentType(type) {
  if (!type) return "";
  const t = String(type).toLowerCase().trim().replace(/[\s-]+/g, "_");
  return ID_TYPE_ALIASES.has(t) ? "identity" : t;
}
function normalizeDocument(doc) {
  if (!doc) return null;
  return {
    ...doc,
    type: canonicalDocumentType(doc.type),
    name: doc.name || doc.title || doc.original_name || doc.file_name || "",
    file_path: doc.file_path || doc.path || doc.url || doc.file_url || doc.storage_path || doc.upload_url || "",
    original_name: doc.original_name || doc.name || doc.title || doc.original_filename || "",
  };
}

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

export default function StudentProfile() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dashboard, setDashboard] = useState(null);
    const [results, setResults] = useState(null);
    const [activities, setActivities] = useState([]);
    const [routine, setRoutine] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [sections, setSections] = useState({
        dashboard: "loading", results: "loading", activities: "loading", routine: "loading", documents: "loading",
    });
    const [error, setError] = useState(null);

    const normalizedDocs = useMemo(() => (documents || []).map(normalizeDocument).filter(Boolean), [documents]);
    const idCardDoc = useMemo(() => normalizedDocs.find((d) => d.type === "identity"), [normalizedDocs]);
    const otherDocs = useMemo(() => normalizedDocs.filter((d) => d.type !== "identity"), [normalizedDocs]);

    const fetchSection = async (key, request) => {
        try {
            const res = await request;
            setSections(prev => ({ ...prev, [key]: "done" }));
            // Pre-unwrap the normalised envelope (`{data:[...]}` or `{data:{...}}`)
            // and return the payload directly. Promise.allSettled's `value` is
            // then the data itself — callers no longer need the confusing
            // `res.value.value` double-wrap. Returns `null` on failure.
            return res?.data?.data ?? res?.data ?? null;
        } catch (err) {
            setSections(prev => ({ ...prev, [key]: "error" }));
            return null;
        }
    };

    const fetchData = useCallback(async () => {
        setError(null);
        setSections({
            dashboard: "loading", results: "loading", activities: "loading", routine: "loading", documents: "loading",
        });
        try {
            const [dashRes, resRes, actRes, routineRes, docRes] = await Promise.allSettled([
                fetchSection("dashboard", api.get("/student/dashboard")),
                fetchSection("results", api.get("/student/results")),
                fetchSection("activities", api.get("/recent-activity")),
                fetchSection("routine", api.get("/student/routine")),
                fetchSection("documents", api.get("/student/documents")),
            ]);

            if (dashRes.status === "fulfilled") setDashboard(dashRes.value ?? null);
            if (resRes.status === "fulfilled") setResults(resRes.value ?? null);
            if (actRes.status === "fulfilled") {
                const data = actRes.value;
                setActivities(Array.isArray(data) ? data : data?.items || []);
            }
            if (routineRes.status === "fulfilled") setRoutine(routineRes.value ?? null);
            if (docRes.status === "fulfilled") setDocuments(Array.isArray(docRes.value) ? docRes.value : (docRes.value ?? []));
        } catch (err) {
            setError("Failed to load profile data. Please try again.");
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const profile = user?.student_profile || {};
    const rawPhotoPath = user?.profile_photo_url || user?.profile_photo_path || profile.admission?.photo_path;
    const photoUrl = buildAssetUrl(rawPhotoPath);
    const dash = dashboard?.student || {};
    const att = dashboard?.attendance || {};
    const pay = dashboard?.payment || dashboard?.payments || {};
    const routineMeta = routine?.meta || {};
    const courseName = dash.course || profile.batch?.course?.title || profile.admission?.course?.title || "Not Assigned";
    const batchName = dash.batch || profile.batch?.name || "Not Assigned";
    const classLink = dash.batch_class_link || profile.batch?.class_link || null;
    const attPercent = att.percentage ?? att.attendancePercentage ?? "-";
    const totalDue = pay.total_due ?? pay.totalDue ?? pay.currentDue ?? 0;
    const courseFee = pay.course_fee ?? pay.monthlyFee ?? 0;
    const feeStatus = totalDue > 0 ? (courseFee && totalDue >= courseFee ? "Overdue" : "Partial") : "Paid";
    const feeColor = feeStatus === "Paid" ? "text-emerald-500" : feeStatus === "Partial" ? "text-amber-500" : "text-red-500";
    const feeBg = feeStatus === "Paid" ? "bg-emerald-50" : feeStatus === "Partial" ? "bg-amber-50" : "bg-red-50";

    const gpa = useMemo(() => {
        if (!results?.length) return null;
        // Prefer the per-exam GPA sent by the server (same basis as the marksheet).
        const gpas = results.map(r => r.gpa).filter(g => g != null);
        if (gpas.length) return (gpas.reduce((s, g) => s + g, 0) / gpas.length).toFixed(2);
        const valid = results.filter(r => r.total_obtained != null && (r.exam?.total_marks ?? r.total_marks) != null);
        if (!valid.length) return null;
        const avg = valid.reduce((s, r) => s + (r.total_obtained / (r.exam?.total_marks ?? r.total_marks)) * 5, 0) / valid.length;
        return avg.toFixed(2);
    }, [results]);

    const totalSubjects = useMemo(() => {
        if (!results?.length) return null;
        const subjects = new Set(results.flatMap(r => {
            const list = r.exam?.subjects || r.subject || [];
            return Array.isArray(list) ? list : [list];
        }).filter(Boolean));
        return subjects.size || null;
    }, [results]);

    const rankInfo = getRankLabel(gpa);

    const shift = profile.shift || routineMeta.shift || (batchName.toLowerCase().includes("morning") ? "Morning" : batchName.toLowerCase().includes("evening") ? "Evening" : batchName);
    const section = profile.section || routineMeta.section || "-";
    const group = profile.group_name || routineMeta.group || routineMeta.department || "-";
    const subject = profile.subject || "-";

    const personalRows = [
        { icon: User, label: "Full Name", value: user?.name },
        { icon: Calendar, label: "Date of Birth", value: profile.dob },
        { icon: User, label: "Gender", value: profile.gender },
        { icon: Activity, label: "Blood Group", value: profile.blood_group },
        { icon: Globe, label: "Religion", value: profile.religion },
        { icon: Globe, label: "Nationality", value: profile.nationality },
    ];

    const academicRows = [
        { icon: IdCard, label: "Student ID", value: profile.student_id_card_no || dash.card_no },
        { icon: BookOpen, label: "Course", value: courseName },
        { icon: Hash, label: "Batch", value: batchName },
        { icon: Calendar, label: "Admission Date", value: profile.admission_date ? new Date(profile.admission_date).toDateString() : (dash.admission_date ? new Date(dash.admission_date).toDateString() : "N/A") },
        { icon: Home, label: "Previous School", value: profile.last_school },
        { icon: Award, label: "SSC GPA", value: profile.ssc_gpa },
        { icon: Award, label: "JSC GPA", value: profile.jsc_gpa },
    ];

    const contactRows = [
        { icon: Phone, label: "Mobile", value: user?.phone },
        { icon: Mail, label: "Email", value: user?.email },
        { icon: MapPin, label: "Present Address", value: profile.present_address },
        { icon: MapPin, label: "Permanent Address", value: profile.permanent_address },
        { icon: Phone, label: "Emergency Contact", value: profile.emergency_contact_name ? `${profile.emergency_contact_name} (${profile.emergency_contact_phone || profile.emergency_mobile || profile.emergency_contact || "N/A"})` + (profile.emergency_contact_relation ? ' · ' + profile.emergency_contact_relation : '') : (profile.emergency_contact_phone || profile.emergency_mobile || profile.emergency_contact || "N/A") },
    ];

    const guardianRows = [
        { icon: User, label: "Father's Name", value: profile.father_name },
        { icon: BriefcaseIcon, label: "Father's Occupation", value: profile.father_occupation },
        { icon: Phone, label: "Father's Mobile", value: profile.father_phone },
        { icon: User, label: "Mother's Name", value: profile.mother_name },
        { icon: BriefcaseIcon, label: "Mother's Occupation", value: profile.mother_occupation },
        { icon: Phone, label: "Mother's Mobile", value: profile.mother_phone },
    ];

    const summaryItems = useMemo(() => [
        { icon: Calendar, label: "Admission Date", value: profile.admission_date ? new Date(profile.admission_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : (dash.admission_date ? new Date(dash.admission_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A") },
        { icon: Hash, label: "Batch", value: batchName },
        { icon: BookOpen, label: "Department", value: courseName },
        { icon: Clock, label: "Shift", value: shift },
        { icon: Building2, label: "Section", value: section },
        { icon: Users, label: "Group", value: group },
        { icon: BookMarked, label: "Subject", value: subject },
        { icon: Calendar, label: "Student Since", value: profile.admission_date ? new Date(profile.admission_date).getFullYear().toString() : (dash.admission_date ? new Date(dash.admission_date).getFullYear().toString() : "N/A") },
    ], [profile.admission_date, dash.admission_date, dash.admission_date, batchName, courseName, shift, section, group, subject]);

    const memberSince = useMemo(() => {
        if (profile.admission_date) return new Date(profile.admission_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        if (user?.created_at) return new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        return "N/A";
    }, [profile.admission_date, user?.created_at]);

    // All hooks above run in a stable order on every render. This guard is the
    // LAST statement before the JSX so React's rules-of-hooks are never
    // violated, even when `user` resolves after the first render.
    if (!user) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="w-10 h-10 border-[3px] border-[#1F4E79] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-gray-400 font-medium">Loading Profile...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 md:space-y-10">
            {/* ========== HERO SECTION ========== */}
            <div className="relative overflow-hidden rounded-[24px] min-h-[240px] md:min-h-[260px]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1F4E79] via-[#1a3f63] to-[#0f2d4a]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12)_0%,transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.04)_0%,transparent_50%)]" />
                <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.04)_0%,transparent_70%)]" />
                <div className="absolute bottom-[-40px] left-[20%] w-[200px] h-[200px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
                <div className="absolute top-[30%] right-[15%] w-[120px] h-[120px] rounded-full border border-white/5" />
                <div className="absolute top-[60%] right-[8%] w-[80px] h-[80px] rounded-full border border-white/5" />

                <div className="relative z-10 flex flex-col justify-between h-full min-h-[240px] md:min-h-[260px] p-5 md:p-7 lg:p-8 gap-4">
                    <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
                        <div className="relative shrink-0">
                            <div className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] lg:w-[96px] lg:h-[96px] rounded-full ring-[3px] ring-white/80 shadow-xl overflow-hidden bg-gradient-to-br from-[#1F4E79] to-[#163859]">
                                {photoUrl ? (
                                    <img
                                        src={photoUrl} alt={user.name}
                                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                        loading="lazy"
                                        onError={(e) => { e.target.style.display = "none"; e.target.nextElementSibling?.classList.remove("hidden"); }}
                                    />
                                ) : null}
                                <div className={`w-full h-full flex items-center justify-center text-white text-2xl md:text-3xl lg:text-4xl font-bold ${photoUrl ? "hidden" : ""}`}>
                                    {user.name?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-emerald-400 ring-2 ring-white" />
                        </div>

                        <div className="min-w-0 flex-1 pt-0.5">
                            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
                                {user.name}
                            </h1>
                            {classLink && (
                                <a href={classLink} target="_blank" rel="noopener noreferrer"
                                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#1F4E79] text-xs font-bold shadow hover:bg-blue-50 transition">
                                    <Video size={13} /> Join Class
                                </a>
                            )}
                            <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2.5 md:mt-3">
                                <HeroBadge icon={IdCard}>
                                    ID: {profile.student_id_card_no || dash.card_no || "---"}
                                </HeroBadge>
                                <HeroBadge icon={BookOpen}>
                                    {courseName}
                                </HeroBadge>
                                <HeroBadge icon={Clock}>
                                    {shift}
                                </HeroBadge>
                                <HeroBadge icon={user.is_active ? CheckCircle : XCircle}>
                                    {user.is_active ? "Active" : "Inactive"}
                                </HeroBadge>
                                {profile.blood_group && (
                                    <HeroBadge icon={Activity}>
                                        {profile.blood_group}
                                    </HeroBadge>
                                )}
                                {section !== "-" && (
                                    <HeroBadge icon={Building2}>
                                        Sec {section}
                                    </HeroBadge>
                                )}
                                {subject !== "-" && (
                                    <HeroBadge icon={BookMarked}>
                                        {subject}
                                    </HeroBadge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                        <HeroStat label="Attendance" value={attPercent !== "-" ? `${attPercent}%` : "-"} icon={Percent} />
                        <HeroStat label="Current GPA" value={gpa ?? "-"} icon={BarChart3} />
                        <HeroStat label="Fee Status" value={feeStatus} icon={CreditCard} />
                        <HeroStat label={rankInfo ? "Rank" : "Subjects"} value={rankInfo?.label ?? totalSubjects?.toString() ?? "-"} icon={rankInfo ? Trophy : BookMarked} />
                    </div>
                </div>
            </div>

            {/* ========== ERROR STATE ========== */}
            {error && (
                <div className="p-4 md:p-6 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-2xl text-center">
                    <AlertCircle size={28} className="mx-auto text-red-400 mb-2.5" />
                    <p className="text-sm text-red-600 font-medium mb-3">{error}</p>
                    <button onClick={fetchData}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors">
                        <RefreshCw size={14} /> Retry
                    </button>
                </div>
            )}

            {/* ========== SUMMARY STRIP ========== */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 divide-x divide-gray-50">
                    {summaryItems.map((item, i) => (
                        <div key={i}
                            className="flex items-center gap-2.5 md:gap-3 p-3.5 md:p-4 lg:p-5 transition-all duration-200 hover:bg-[#F0F4F8] group cursor-default">
                            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-[#F0F4F8] group-hover:bg-white flex items-center justify-center shrink-0 transition-colors duration-200">
                                <item.icon size={14} className="text-[#1F4E79]" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] md:text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                 <p className="text-xs md:text-sm font-semibold text-gray-800 whitespace-normal break-words leading-tight [overflow-wrap:anywhere]">{item.value ?? "-"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ========== MAIN GRID ========== */}
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[360px_1fr] gap-6 md:gap-8">
                {/* ===== LEFT COLUMN ===== */}
                <div className="space-y-5 md:space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <StatCard
                            label="Attendance"
                            value={attPercent !== "-" ? `${attPercent}%` : "-"}
                            desc={attPercent !== "-" ? (att.percentage >= 80 ? "Excellent Attendance" : att.percentage >= 60 ? "Moderate" : "Needs Improvement") : "No data"}
                            icon={Percent}
                            color="text-emerald-500" bg="bg-emerald-50"
                            loading={sections.dashboard === "loading"}
                        />
                        <StatCard
                            label="Current GPA"
                            value={gpa ?? "-"}
                            desc={profile.ssc_gpa ? `SSC: ${profile.ssc_gpa}` : "Not available"}
                            icon={BarChart3}
                            color="text-blue-500" bg="bg-blue-50"
                            loading={sections.results === "loading"}
                        />
                        <StatCard
                            label="Fee Status"
                            value={feeStatus}
                            desc={feeStatus === "Paid" ? "No Dues" : feeStatus === "Partial" ? "Partial Due" : "Overdue"}
                            icon={CreditCard}
                            color={feeColor} bg={feeBg}
                            loading={sections.dashboard === "loading"}
                        />
                        <StatCard
                            label="Subjects"
                            value={totalSubjects ?? "-"}
                            desc={totalSubjects ? "Currently Enrolled" : "Not available"}
                            icon={BookMarked}
                            color="text-violet-500" bg="bg-violet-50"
                            loading={sections.results === "loading"}
                        />
                    </div>

                    {/* Profile Completion */}
                    <ProfileCompletionCard profile={profile} user={user} loading={false} />

                    {/* Account */}
                    <AccountCard profile={profile} user={user} loading={false} memberSince={memberSince} />
                </div>

                {/* ===== RIGHT COLUMN ===== */}
                <div className="space-y-5 md:space-y-6">
                    {/* Personal & Academic */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 lg:gap-8">
                        <InfoCard icon={User} title="Personal Information" rows={personalRows} loading={false} />
                        <InfoCard icon={GraduationCap} title="Academic Information" rows={academicRows} loading={false} />
                    </div>

                    {/* Contact & Guardian */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 lg:gap-8">
                        <InfoCard icon={MapPin} title="Contact Information" rows={contactRows} loading={false} />
                        <InfoCard icon={Users} title="Guardian Information" rows={guardianRows} loading={false} />
                    </div>

                    {/* ID Card, Documents & Recent Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 lg:gap-8 items-start">
                        {/* ID Card — Direct Visual Preview */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-[#F0F4F8] flex items-center justify-center">
                                    <IdCard size={14} className="text-[#1F4E79]" />
                                </div>
                                <h3 className="text-base md:text-lg font-bold text-gray-900">ID Card</h3>
                            </div>
                            {sections.documents === "loading" ? (
                                <Skeleton className="w-full aspect-[4/3] rounded-xl" />
                            ) : !idCardDoc ? (
                                <div className="bg-white rounded-xl border border-gray-100 border-dashed flex flex-col items-center justify-center min-h-[200px] p-5 text-center">
                                    <IdCard size={32} className="text-gray-300 mb-2" />
                                    <p className="text-sm text-gray-400">No ID card uploaded</p>
                                    <p className="text-[11px] text-gray-300 mt-1">Your ID card will appear here once uploaded by the admin</p>
                                </div>
                            ) : getDocPreviewType(idCardDoc) === "pdf" ? (
                                <embed
                                    src={buildAuthenticatedAssetUrl(idCardDoc.file_path, idCardDoc.download_token)}
                                    type="application/pdf"
                                    className="w-full h-72 rounded-xl border border-gray-100"
                                    title={idCardDoc.name || "Student ID Card"}
                                />
                            ) : getDocPreviewType(idCardDoc) === "other" ? (
                                <div className="bg-white rounded-xl border border-gray-100 flex flex-col items-center justify-center min-h-[200px] p-5 text-center">
                                    <FileText size={36} className="text-gray-300 mb-2" />
                                    <p className="text-sm font-semibold text-gray-800 truncate">{idCardDoc.name || "ID Card"}</p>
                                    <a
                                        href={buildAuthenticatedAssetUrl(idCardDoc.file_path, idCardDoc.download_token)}
                                        download={idCardDoc.original_name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 text-[11px] font-semibold text-[#1F4E79] hover:underline"
                                    >Download</a>
                                </div>
                            ) : (
                                <div className="w-full bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden p-2">
                                    <img
                                        src={buildAuthenticatedAssetUrl(idCardDoc.file_path, idCardDoc.download_token)}
                                        alt={idCardDoc.name || "Student ID Card"}
                                        className="max-w-full max-h-[300px] w-auto h-auto object-contain"
                                        loading="lazy"
                                    />
                                </div>
                            )}
                            {idCardDoc && idCardDoc.file_path && (getDocPreviewType(idCardDoc) === "image" || getDocPreviewType(idCardDoc) === "pdf") && (
                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        onClick={() => handlePrintDocument(buildAuthenticatedAssetUrl(idCardDoc.file_path, idCardDoc.download_token))}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                        title="Print"
                                        aria-label="Print ID card">
                                        <Printer size={14} />
                                    </button>
                                    <a
                                        href={buildAuthenticatedAssetUrl(idCardDoc.file_path, idCardDoc.download_token)}
                                        download={idCardDoc.original_name || idCardDoc.name || "id-card"}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#1F4E79] text-white hover:bg-[#163859] transition-colors"
                                        title="Download"
                                        aria-label="Download ID card">
                                        <Download size={14} />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Documents */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-7 h-7 rounded-lg bg-[#F0F4F8] flex items-center justify-center">
                                    <FileText size={14} className="text-[#1F4E79]" />
                                </div>
                                <h3 className="text-base md:text-lg font-bold text-gray-900">Documents</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:gap-4">
                                {sections.documents === "loading" ? (
                                    <>
                                        <DocCardSkeleton />
                                        <DocCardSkeleton />
                                        <DocCardSkeleton />
                                    </>
                                ) : otherDocs.length === 0 ? (
                                    <div className="col-span-full text-center py-6 bg-white rounded-xl border border-gray-100">
                                        <FileText size={24} className="mx-auto text-gray-300 mb-2" />
                                        <p className="text-sm text-gray-400">No documents uploaded</p>
                                        <p className="text-[11px] text-gray-300 mt-1">Admin can upload documents from the student details page</p>
                                    </div>
                                ) : (
                                    otherDocs.map((doc) => (
                                        <DocCard
                                            key={doc.id}
                                            name={doc.name}
                                            type={doc.type}
                                            fileUrl={buildAuthenticatedAssetUrl(doc.file_path, doc.download_token)}
                                            loading={false}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <ActivityCard activities={activities} loading={sections.activities === "loading"} navigate={navigate} />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── COMPONENTS ─── */

function StatCard({ label, value, desc, icon: Icon, color, bg, loading }) {
    return (
        <div className="group bg-white rounded-2xl border border-gray-100 p-5 md:p-7 transition-all duration-300 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5">
            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-2.5 w-24" />
                </div>
            ) : (
                <>
                    <div className="flex items-start justify-between mb-4">
                        <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl ${bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                            <Icon size={18} className={color} />
                        </div>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{value ?? "-"}</p>
                    <p className="text-[11px] md:text-xs text-gray-400 leading-relaxed">{desc}</p>
                </>
            )}
        </div>
    );
}

function InfoCard({ icon: Icon, title, rows, loading }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
            <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center gap-2.5">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-[#1F4E79]" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-gray-900">{title}</h3>
            </div>
            <div className="px-6 md:px-7 py-5 md:py-6">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="space-y-1.5">
                                <Skeleton className="h-2.5 w-16" />
                                <Skeleton className="h-4 w-40" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-0 divide-y divide-gray-50">
                        {rows.map((row, i) => (
                            <div key={i} className="flex items-start gap-3 py-2.5 md:py-3 first:pt-0 last:pb-0">
                                {row.icon && (
                                    <div className="w-7 h-7 rounded-lg bg-[#F0F4F8] flex items-center justify-center shrink-0 mt-0.5">
                                        <row.icon size={12} className="text-gray-400" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                                        {row.label}
                                    </p>
                                    <p className="text-sm md:text-[15px] text-gray-800 font-medium leading-snug break-words">
                                        {row.value || "Not Available"}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ProfileCompletionCard({ profile, user, loading }) {
    const fields = useMemo(() => [
        { key: "photo", label: "Profile Photo", done: !!(user?.profile_photo_path || user?.profile_photo_url || profile?.admission?.photo_path || profile?.photo_path) },
        { key: "email", label: "Email Address", done: true },
        { key: "blood", label: "Blood Group", done: !!profile?.blood_group },
        { key: "address", label: "Address", done: !!profile?.present_address },
    ], [profile, user]);

    const completed = fields.filter((f) => f.done).length;
    const percent = fields.length > 0 ? Math.round((completed / fields.length) * 100) : 0;
    const circumference = 2 * Math.PI * 32;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-7 transition-all duration-300 hover:shadow-lg hover:border-gray-200">
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-5 w-32 mx-auto" />
                    <Skeleton className="h-28 w-28 rounded-full mx-auto" />
                    <Skeleton className="h-3 w-24 mx-auto" />
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm md:text-base font-bold text-gray-900">Profile Completion</h3>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="relative w-28 h-28 mb-3">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
                                <circle cx="36" cy="36" r="32" fill="none" stroke="#F0F4F8" strokeWidth="5" />
                                <circle cx="36" cy="36" r="32" fill="none" stroke="#1F4E79" strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl md:text-3xl font-bold text-[#1F4E79]">{percent}%</span>
                            </div>
                        </div>
                        <div className="w-full space-y-2">
                            {fields.map((f) => (
                                <div key={f.key} className="flex items-center gap-2.5">
                                    {f.done ? (
                                        <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <XCircle size={14} className="text-gray-300 shrink-0" />
                                    )}
                                    <span className={`text-xs md:text-sm ${f.done ? "text-gray-500" : "text-gray-400"}`}>{f.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function AccountCard({ profile, user, loading, memberSince }) {
    const items = [
        { icon: Shield, label: "Password", value: "********" },
        { icon: Calendar, label: "Member Since", value: memberSince },
        { icon: Mail, label: "Email", value: user.email, badge: "Verified" },
    ];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-7 transition-all duration-300 hover:shadow-lg hover:border-gray-200">
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-xl bg-[#F0F4F8] flex items-center justify-center">
                    <Shield size={15} className="text-[#1F4E79]" />
                </div>
                <h3 className="text-sm md:text-base font-bold text-gray-900">Account</h3>
            </div>
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-2 md:py-2.5 border-b border-gray-50 last:border-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-[#F0F4F8] flex items-center justify-center">
                                    <item.icon size={12} className="text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-xs md:text-sm font-medium text-gray-700">{item.label}</p>
                                    <p className="text-[11px] md:text-xs text-gray-400">{item.value}</p>
                                </div>
                            </div>
                            {item.badge && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] md:text-[11px] font-medium">{item.badge}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function getDocIcon(type) {
    if (type === "image" || type === "photo") return Image;
    if (type === "identity") return IdCard;
    if (type === "form") return FileText;
    if (type === "academic" || type === "certificate") return Award;
    return FileText;
}

function getDocPreviewType(doc) {
    const name = (doc?.original_name || doc?.file_path || doc?.name || "").toLowerCase();
    if (/\.pdf$/.test(name)) return "pdf";
    if (/\.(png|jpe?g|jpg|gif|webp|bmp|svg)$/.test(name)) return "image";
    return "other";
}

function handlePrintDocument(url) {
    const win = window.open(url, "_blank");
    if (!win) return;
    const fire = () => { try { win.focus(); win.print(); } catch (e) { /* ignore */ } };
    win.addEventListener("load", fire);
    setTimeout(fire, 600);
}

function DocCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-5">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                </div>
            </div>
        </div>
    );
}

function DocCard({ name, type, fileUrl }) {
    const Icon = getDocIcon(type);
    const displayName = name || "Untitled document";
    const actionBtn = "inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors";

    return (
        <div className="group bg-white rounded-xl border border-gray-100 p-4 md:p-5 transition-all duration-200 hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5">
            {/* Row 1: document icon + title, vertically aligned */}
            <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-[#F0F4F8] flex items-center justify-center transition-colors duration-200 group-hover:bg-[#1F4E79]/5">
                    <Icon size={17} className="text-[#1F4E79]/70" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-gray-800 truncate" title={displayName}>{displayName}</p>
                    {type && <p className="text-[10px] md:text-[11px] text-gray-400 capitalize truncate">{type}</p>}
                </div>
            </div>
            {/* Row 2: View / Print / Download, evenly spaced and fully contained */}
            <div className="flex items-center justify-end gap-1.5 mt-3">
                {fileUrl ? (
                    <>
                        <button
                            onClick={() => handlePrintDocument(fileUrl)}
                            className={actionBtn}
                            title="Print"
                            aria-label="Print document">
                            <Printer size={14} />
                        </button>
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                            className={actionBtn} title="View" aria-label="View document">
                            <Eye size={14} />
                        </a>
                        <a href={fileUrl} download
                            className={actionBtn} title="Download" aria-label="Download document">
                            <Download size={14} />
                        </a>
                    </>
                ) : (
                    <span className="text-[10px] text-gray-300 italic whitespace-nowrap">No file</span>
                )}
            </div>
        </div>
    );
}

function ActivityCard({ activities, loading, navigate }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
            <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-[#F0F4F8] flex items-center justify-center">
                        <Clock size={15} className="text-[#1F4E79]" />
                    </div>
                    <h3 className="text-sm md:text-base font-bold text-gray-900">Recent Activity</h3>
                </div>
                {activities.length > 3 && (
                    <button
                        onClick={() => navigate("/student/notifications")}
                        className="text-[11px] md:text-xs font-semibold text-[#1F4E79] hover:underline flex items-center gap-1 transition-colors"
                    >
                        View all <ChevronRight size={12} />
                    </button>
                )}
            </div>
            <div className="px-6 md:px-7 py-5 md:py-6">
                {loading ? (
                    <div className="space-y-5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-3">
                                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                                <div className="space-y-1.5 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    <div className="text-center py-6">
                        <Bell size={22} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">No recent activity</p>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="absolute left-[17px] top-3 bottom-3 w-px bg-gray-100" />
                        <div className="space-y-0">
                            {activities.slice(0, 3).map((act, i) => {
                                const created = act.createdAt || act.created_at;
                                return (
                                    <TimelineItem key={i}
                                        action={act.title || act.action || "Activity"}
                                        time={act.time_ago || (created ? new Date(created).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A")}
                                        index={i}
                                        isLast={i === Math.min(activities.length, 3) - 1}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TimelineItem({ action, time, isLast }) {
    return (
        <div className="flex gap-3 md:gap-4 group relative">
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-[34px] h-[34px] rounded-xl bg-[#F0F4F8] flex items-center justify-center transition-colors duration-200 group-hover:bg-[#1F4E79]/10 ring-2 ring-white">
                    <Activity size={13} className="text-gray-400 transition-colors duration-200 group-hover:text-[#1F4E79]" />
                </div>
            </div>
            <div className={`flex-1 ${!isLast ? "pb-5 md:pb-6" : ""}`}>
                <p className="text-sm md:text-[15px] font-medium text-gray-800">{action}</p>
                <p className="text-xs md:text-[13px] text-gray-400 mt-0.5">{time}</p>
            </div>
        </div>
    );
}

function BriefcaseIcon({ size, className }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
    );
}
