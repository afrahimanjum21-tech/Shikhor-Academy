import { useAuth } from "../../context/AuthContext";
import { User, Phone, Mail, Hash, Calendar, GraduationCap, MapPin, Shield, BookOpen, Edit } from "lucide-react";

export default function StudentProfile() {
    const { user } = useAuth();
    if (!user) return <div className="p-10 text-center text-[#1F4E79]">Loading Profile...</div>;

    const profile = user.student_profile || {};
    const admissionDate = profile.admission_date ? new Date(profile.admission_date).toDateString() : 'N/A';
    
    const rawPhotoPath = user.profile_photo_url || user.profile_photo_path || profile.admission?.photo_path;
    const photoUrl = rawPhotoPath?.startsWith('http') ? rawPhotoPath : (rawPhotoPath ? `http://localhost:8000/${rawPhotoPath}` : null);

    const courseName = profile.batch?.course?.title || profile.admission?.course?.title || 'Not Assigned';
    const batchName = profile.batch?.name || 'Not Assigned';

    const InfoRow = ({ label, value }) => (
        <div className="flex flex-col sm:flex-row border-b border-gray-100 py-3 last:border-0 hover:bg-gray-50 px-2 gap-1 sm:gap-4">
            <span className="text-gray-500 text-xs font-bold uppercase w-full sm:w-1/3 mb-1 sm:mb-0 shrink-0">
                {label}
            </span>
            <span className="text-gray-900 font-medium text-sm w-full sm:w-2/3 break-words whitespace-pre-wrap leading-relaxed">
                {value || '-'}
            </span>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto font-sans pb-10 px-2 md:px-0">
            
            {/* --- Header Section (Fixed Layout) --- */}
            <div className="mb-8">
                {/* 1. Background Cover */}
                <div className="h-40 w-full bg-gradient-to-r from-[#1F4E79] to-[#163859] rounded-b-3xl shadow-lg"></div>
                
                {/* 2. Profile Content (Using Negative Margin instead of Absolute) */}
                <div className="px-4 md:px-8 flex flex-col md:flex-row items-center md:items-end -mt-16 gap-4">
                    
                    {/* Avatar */}
                    <div className="w-32 h-32 bg-white p-1.5 rounded-full shadow-xl z-10 border-4 border-white flex-shrink-0">
                        {photoUrl ? (
                            <img 
                                src={photoUrl} 
                                alt={user.name} 
                                className="w-full h-full object-cover rounded-full" 
                                onError={(e) => { e.target.style.display = 'none'; }} 
                            />
                        ) : (
                            <div className="w-full h-full bg-[#F0F4F8] rounded-full flex items-center justify-center text-[#1F4E79] text-5xl font-bold">
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Name & ID (Flow Content) */}
                    <div className="flex-1 text-center md:text-left mt-2 w-full">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 break-words leading-tight">
                            {user.name}
                        </h1>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-[#1F4E79] font-medium text-sm bg-blue-50 px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
                            <Shield size={16} /> 
                            <span>ID: <span className="font-mono font-bold">{profile.student_id_card_no || '---'}</span></span>
                        </div>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-2 md:mb-4">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                            user.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                            {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                    </div>
                </div>
            </div>

            {/* --- Info Grid --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2 md:px-4">
                
                {/* Academic */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
                    <h2 className="text-lg font-bold text-[#1F4E79] mb-4 border-b pb-2 flex items-center gap-2"><GraduationCap size={18}/> Academic Info</h2>
                    <InfoRow label="Course" value={courseName} />
                    <InfoRow label="Batch" value={batchName} />
                    <InfoRow label="Admission Date" value={admissionDate} />
                    <InfoRow label="Previous School" value={profile.last_school} />
                    <InfoRow label="SSC GPA" value={profile.ssc_gpa} />
                    <InfoRow label="JSC GPA" value={profile.jsc_gpa} />
                </div>

                {/* Personal */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
                    <h2 className="text-lg font-bold text-[#1F4E79] mb-4 border-b pb-2 flex items-center gap-2"><User size={18}/> Personal Info</h2>
                    <InfoRow label="Date of Birth" value={profile.dob} />
                    <InfoRow label="Gender" value={profile.gender} />
                    <InfoRow label="Blood Group" value={profile.blood_group} />
                    <InfoRow label="Religion" value={profile.religion} />
                    <InfoRow label="Mobile" value={user.phone} />
                    <InfoRow label="Email" value={user.email} />
                </div>

                {/* Guardian */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
                    <h2 className="text-lg font-bold text-[#1F4E79] mb-4 border-b pb-2 flex items-center gap-2"><Shield size={18}/> Guardian Info</h2>
                    <InfoRow label="Father Name" value={profile.father_name} />
                    <InfoRow label="Father Mobile" value={profile.father_mobile} />
                    <InfoRow label="Father Occupation" value={profile.father_occupation} />
                    <div className="border-t border-dashed my-2"></div>
                    <InfoRow label="Mother Name" value={profile.mother_name} />
                    <InfoRow label="Mother Mobile" value={profile.mother_mobile} />
                </div>

                {/* Address */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
                    <h2 className="text-lg font-bold text-[#1F4E79] mb-4 border-b pb-2 flex items-center gap-2"><MapPin size={18}/> Address & Contact</h2>
                    <InfoRow label="Present Address" value={profile.present_address} />
                    <InfoRow label="Permanent Address" value={profile.permanent_address} />
                    <div className="border-t border-dashed my-2"></div>
                    <InfoRow label="Emergency Name" value={profile.emergency_name} />
                    <InfoRow label="Emergency Mobile" value={profile.emergency_mobile} />
                </div>
            </div>
        </div>
    );
}
