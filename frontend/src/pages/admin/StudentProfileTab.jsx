import { useOutletContext } from "react-router-dom";
import { Edit, Save, Upload } from "lucide-react";

export default function StudentProfileTab() {
    const ctx = useOutletContext();

    const { student, formData, isEditing, setIsEditing, photoFile, setPhotoFile,
            photoUrl, timestamp, batches, courses, handleUpdate, handleChange,
            setFormData, prof } = ctx;

    return (
        <div className="space-y-6">
            {/* Edit/Save Buttons */}
            <div className="flex justify-end gap-3">
                {isEditing ? (
                    <>
                        <button onClick={() => {setIsEditing(false); setPhotoFile(null);}} className="px-4 py-2 bg-gray-200 rounded text-gray-700 font-bold text-sm">Cancel</button>
                        <button onClick={handleUpdate} className="px-4 py-2 bg-[#1F4E79] text-white rounded font-bold text-sm flex items-center gap-2">
                            <Save size={16}/> Save
                        </button>
                    </>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded font-bold text-sm flex items-center gap-2 hover:bg-blue-700">
                        <Edit size={16}/> Edit Profile
                    </button>
                )}
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="h-32 bg-[#1F4E79]"></div>
                <div className="px-8 pb-6 flex flex-col md:flex-row items-center md:items-end -mt-16 gap-6">
                    <div className="w-32 h-32 bg-white p-1 rounded-full shadow-lg border-4 border-white relative group overflow-hidden flex-shrink-0">
                        {photoFile ? (
                            <img src={URL.createObjectURL(photoFile)} className="w-full h-full object-cover rounded-full" />
                        ) : photoUrl ? (
                            <img src={photoUrl} className="w-full h-full object-cover rounded-full" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}/>
                        ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-4xl font-bold text-gray-500 rounded-full">{student.name.charAt(0)}</div>
                        )}

                        {isEditing && (
                            <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center cursor-pointer text-white opacity-0 group-hover:opacity-100 transition rounded-full z-10">
                                <Upload size={24}/>
                                <span className="text-xs">Change</span>
                                <input type="file" className="hidden" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} />
                            </label>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left mb-2 w-full">
                        {isEditing ? (
                            <input name="name" value={formData.name} onChange={handleChange} className="text-2xl font-bold border p-2 rounded w-full md:w-1/2 border-blue-300 outline-none" />
                        ) : (
                            <h1 className="text-3xl font-bold text-gray-900 break-words">{student.name}</h1>
                        )}
                        <p className="text-gray-500 font-medium">ID: {formData.student_id_card_no}</p>
                    </div>
                </div>
            </div>

            {/* Details Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-[#1F4E79] border-b pb-2 mb-4">Account & Personal</h3>
                    <div className="space-y-4">
                        <Field label="Login Email" name="email" value={formData.email} isEditing={isEditing} onChange={handleChange} />
                        {isEditing && <Field label="New Password" name="password" value={formData.password} isEditing={isEditing} onChange={handleChange} placeholder="Leave blank to keep same" />}
                        <Field label="Phone" name="phone" value={formData.phone} isEditing={isEditing} onChange={handleChange} />
                        <Field label="Date of Birth" name="dob" value={formData.dob} isEditing={isEditing} onChange={handleChange} type="date" />
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Gender" name="gender" value={formData.gender} isEditing={isEditing} onChange={handleChange} />
                            <Field label="Blood Group" name="blood_group" value={formData.blood_group} isEditing={isEditing} onChange={handleChange} />
                        </div>
                        <Field label="Religion" name="religion" value={formData.religion} isEditing={isEditing} onChange={handleChange} />
                        <Field label="Nationality" name="nationality" value={formData.nationality} isEditing={isEditing} onChange={handleChange} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-[#1F4E79] border-b pb-2 mb-4">Guardian Info</h3>
                    <div className="space-y-4">
                        <Field label="Father Name" name="father_name" value={formData.father_name} isEditing={isEditing} onChange={handleChange} />
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Father Mobile" name="father_mobile" value={formData.father_mobile} isEditing={isEditing} onChange={handleChange} />
                            <Field label="Occupation" name="father_occupation" value={formData.father_occupation} isEditing={isEditing} onChange={handleChange} />
                        </div>
                        <div className="border-t border-dashed my-2"></div>
                        <Field label="Mother Name" name="mother_name" value={formData.mother_name} isEditing={isEditing} onChange={handleChange} />
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Mother Mobile" name="mother_mobile" value={formData.mother_mobile} isEditing={isEditing} onChange={handleChange} />
                            <Field label="Occupation" name="mother_occupation" value={formData.mother_occupation} isEditing={isEditing} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 md:col-span-2">
                    <h3 className="text-lg font-bold text-[#1F4E79] border-b pb-2 mb-4">Other Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Field label="Student ID" name="student_id_card_no" value={formData.student_id_card_no} isEditing={isEditing} onChange={handleChange} />

                            <div className="flex flex-col w-full">
                                <span className="text-xs font-bold text-gray-500 uppercase">Course</span>
                                {isEditing ? (
                                    <select name="course_id" value={formData.course_id || ''} onChange={handleChange} className="border border-gray-300 p-2 rounded text-sm mt-1 bg-white outline-none w-full">
                                        <option value="">Select Course</option>
                                        {courses.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}
                                    </select>
                                ) : (
                                    <span className="text-gray-900 font-medium text-sm mt-1 border-b border-gray-50 pb-1 w-full break-words">
                                        {formData.course_name || 'Not Assigned'}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col w-full">
                                <span className="text-xs font-bold text-gray-500 uppercase">Batch</span>
                                {isEditing ? (
                                    <select name="current_batch_id" value={formData.current_batch_id || ''} onChange={handleChange} className="border border-gray-300 p-2 rounded text-sm mt-1 bg-white outline-none w-full">
                                        <option value="">Select Batch</option>
                                        {batches.map(b => (<option key={b.id} value={b.id}>{b.course?.title} - {b.name}</option>))}
                                    </select>
                                ) : (
                                    <span className="text-gray-900 font-medium text-sm mt-1 border-b border-gray-50 pb-1 w-full break-words">
                                        {formData.batch_name || 'Not Assigned'}
                                    </span>
                                )}
                            </div>
                            <Field label="Last School" name="last_school" value={formData.last_school} isEditing={isEditing} onChange={handleChange} />
                        </div>
                        <div className="space-y-4">
                            <Field label="Present Address" name="present_address" value={formData.present_address} isEditing={isEditing} onChange={handleChange} />
                            <Field label="Permanent Address" name="permanent_address" value={formData.permanent_address} isEditing={isEditing} onChange={handleChange} />
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="SSC GPA" name="ssc_gpa" value={formData.ssc_gpa} isEditing={isEditing} onChange={handleChange} />
                                <Field label="JSC GPA" name="jsc_gpa" value={formData.jsc_gpa} isEditing={isEditing} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, name, value, isEditing, onChange, type = "text", placeholder }) {
    return (
        <div className="flex flex-col w-full">
            <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
            {isEditing ? (
                <input
                    name={name} type={type} value={value || ''} onChange={onChange} placeholder={placeholder}
                    className="border border-gray-300 p-2 rounded text-sm focus:border-[#1F4E79] focus:ring-1 focus:ring-[#1F4E79] outline-none mt-1 w-full"
                />
            ) : (
                <span className="text-gray-900 font-medium text-sm mt-1 border-b border-gray-50 pb-1 w-full break-words whitespace-normal">
                    {value || 'N/A'}
                </span>
            )}
        </div>
    );
}
