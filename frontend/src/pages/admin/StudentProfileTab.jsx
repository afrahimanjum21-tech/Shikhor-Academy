import { useOutletContext } from "react-router-dom";

export default function StudentProfileTab() {
    const ctx = useOutletContext();
    if (!ctx) return <div className="p-10 text-center text-red-500">Context not available</div>;

    const { student, formData, isEditing, setIsEditing, photoFile, setPhotoFile,
            photoUrl, batches, courses, handleUpdate, handleChange, saving } = ctx;

    return (
        <div className="space-y-6">
            {/* Edit/Save Bar */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-6 md:px-7 py-4">
                <div>
                    <h2 className="text-base md:text-lg font-bold text-gray-900">Profile Information</h2>
                    <p className="text-xs md:text-sm text-gray-400 mt-0.5">Manage student's personal and academic details</p>
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <button onClick={() => { !saving && setIsEditing(false); setPhotoFile?.(null); }}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                                Cancel
                            </button>
                            <button onClick={handleUpdate}
                                disabled={saving}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F4E79] text-white hover:bg-[#163859] font-bold text-sm transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                                {saving ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.175 5.824 3 7.938l3-2.707z" />
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F4E79] text-white hover:bg-[#163859] font-bold text-sm transition-all shadow-sm">
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>

            {/* Photo Upload Card (only when editing) */}
            {isEditing && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-7 transition-all duration-300 hover:shadow-lg hover:border-gray-200">
                    <div className="flex items-center gap-6">
                        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 ring-2 ring-gray-200 shrink-0">
                            {photoFile ? (
                                <img src={URL.createObjectURL(photoFile)} className="w-full h-full object-cover" alt="" />
                            ) : photoUrl ? (
                                <img src={photoUrl} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-2xl font-bold text-gray-400">
                                    {student?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-700">Profile Photo</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Upload a new photo for this student</p>
                            <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1F4E79]/10 text-[#1F4E79] rounded-lg text-xs font-bold cursor-pointer hover:bg-[#1F4E79]/20 transition-all">
                                <input type="file" className="hidden" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} />
                                Choose Photo
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <InfoCard title="Personal Information" rows={getPersonalRows(ctx, isEditing)} isEditing={isEditing} onChange={handleChange} formData={formData} />
                <InfoCard title="Academic Information" rows={getAcademicRows(ctx, isEditing)} isEditing={isEditing} onChange={handleChange} formData={formData} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                 <InfoCard title="Guardian Information" rows={getGuardianRows(ctx, isEditing)} isEditing={isEditing} onChange={handleChange} formData={formData} />
                 <InfoCard title="Address" rows={getAddressRows(ctx, isEditing)} isEditing={isEditing} onChange={handleChange} formData={formData} />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                 <div className="md:col-span-2">
                     <InfoCard title="Emergency Contact" rows={getEmergencyRows(ctx)} isEditing={isEditing} onChange={handleChange} formData={formData} />
                 </div>
             </div>
        </div>
    );
}

/* ─── ROW DATA ─── */

function getPersonalRows(ctx, isEditing) {
    const { student, formData } = ctx;
    return [
        { label: "Full Name", name: "name", value: student?.name, type: "text" },
        { label: "Email", name: "email", value: formData?.email, type: "email" },
        { label: "Phone", name: "phone", value: formData?.phone, type: "text" },
        { label: "Date of Birth", name: "dob", value: formData?.dob, type: "date" },
        { label: "Gender", name: "gender", value: formData?.gender, type: "text" },
        { label: "Blood Group", name: "blood_group", value: formData?.blood_group, type: "text" },
        { label: "Religion", name: "religion", value: formData?.religion, type: "text" },
        { label: "Nationality", name: "nationality", value: formData?.nationality, type: "text" },
        ...(isEditing ? [{ label: "New Password", name: "password", value: formData?.password, type: "password", placeholder: "Leave blank to keep same" }] : []),
    ];
}

function getAcademicRows(ctx, isEditing) {
    const { formData, prof, batches, courses } = ctx;
    const rows = [
        { label: "Student ID", name: "student_id_card_no", value: formData?.student_id_card_no, type: "text" },
    ];
    if (isEditing) {
        rows.push(
            { label: "Course", name: "course_id", value: formData?.course_id, type: "select", options: (courses || []).map(c => ({ value: c.id, label: c.title })) },
            { label: "Batch", name: "current_batch_id", value: formData?.current_batch_id, type: "select", options: (batches || []).map(b => ({ value: b.id, label: `${b.course?.title || ''} - ${b.name}` })) },
        );
    } else {
        rows.push(
            { label: "Course", name: "course_id", value: formData?.course_name || prof?.batch?.course?.title || 'Not Assigned' },
            { label: "Batch", name: "current_batch_id", value: formData?.batch_name || 'Not Assigned' },
        );
    }
    rows.push(
        { label: "Shift", name: "shift", value: formData?.shift, type: "text" },
        { label: "Section", name: "section", value: formData?.section, type: "text" },
        { label: "Group", name: "group_name", value: formData?.group_name, type: "text" },
        { label: "Subject", name: "subject", value: formData?.subject, type: "text" },
        { label: "Last School", name: "last_school", value: formData?.last_school, type: "text" },
        { label: "SSC GPA", name: "ssc_gpa", value: formData?.ssc_gpa, type: "text" },
        { label: "JSC GPA", name: "jsc_gpa", value: formData?.jsc_gpa, type: "text" },
    );
    return rows;
}

function getGuardianRows(ctx) {
    const { formData } = ctx;
    return [
        { label: "Father's Name", name: "father_name", value: formData?.father_name, type: "text" },
        { label: "Father's Occupation", name: "father_occupation", value: formData?.father_occupation, type: "text" },
        { label: "Father's Mobile", name: "father_phone", value: formData?.father_phone, type: "text" },
        { label: "Mother's Name", name: "mother_name", value: formData?.mother_name, type: "text" },
        { label: "Mother's Occupation", name: "mother_occupation", value: formData?.mother_occupation, type: "text" },
        { label: "Mother's Mobile", name: "mother_phone", value: formData?.mother_phone, type: "text" },
    ];
}

function getAddressRows(ctx) {
    const { formData } = ctx;
    return [
        { label: "Present Address", name: "present_address", value: formData?.present_address, type: "text" },
        { label: "Permanent Address", name: "permanent_address", value: formData?.permanent_address, type: "text" },
    ];
}

function getEmergencyRows(ctx) {
    const { formData } = ctx;
    return [
        { label: "Emergency Contact Name", name: "emergency_contact_name", value: formData?.emergency_contact_name, type: "text" },
        { label: "Emergency Contact Phone", name: "emergency_contact_phone", value: formData?.emergency_contact_phone, type: "text" },
        { label: "Emergency Contact Relation", name: "emergency_contact_relation", value: formData?.emergency_contact_relation, type: "text", placeholder: "e.g. Father, Mother, Guardian" },
    ];
}

/* ─── INFOCARD COMPONENT ─── */

function InfoCard({ title, rows, isEditing, onChange, formData }) {
    if (!rows || !rows.length) return null;
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200">
            <div className="px-6 md:px-7 py-4 md:py-5 border-b border-gray-50">
                <h3 className="text-sm md:text-base font-bold text-gray-900">{title}</h3>
            </div>
            <div className="px-6 md:px-7 py-5 md:py-6">
                <div className="space-y-0 divide-y divide-gray-50">
                    {rows.map((row, i) => (
                        <div key={i} className="flex items-start gap-3 py-2.5 md:py-3 first:pt-0 last:pb-0">
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] md:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                                    {row.label}
                                </p>
                                {isEditing ? (
                                    row.type === "select" ? (
                                        <select
                                            name={row.name}
                                            value={formData?.[row.name] || ''}
                                            onChange={onChange}
                                            className="w-full border border-gray-300 p-1.5 rounded text-sm bg-white outline-none focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79]"
                                        >
                                            <option value="">Select {row.label}</option>
                                            {(row.options || []).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            name={row.name}
                                            type={row.type || "text"}
                                            value={formData?.[row.name] || ''}
                                            onChange={onChange}
                                            placeholder={row.placeholder || ""}
                                            className="w-full border border-gray-300 p-1.5 rounded text-sm outline-none focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79]"
                                        />
                                    )
                                ) : (
                                    <p className="text-sm md:text-[15px] text-gray-800 font-medium leading-snug break-words">
                                        {row.value || "Not Available"}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
