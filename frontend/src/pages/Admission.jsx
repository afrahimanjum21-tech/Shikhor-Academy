import { useState, useEffect } from "react";
import api from "../services/api";

export default function Admission() {
    const [courses, setCourses] = useState([]);
    const [formData, setFormData] = useState({
        // Basic
        full_name: '', email: '', phone: '', dob: '', course_id: '', photo: null,
        // Personal
        gender: '', religion: 'Islam', blood_group: '', nationality: 'Bangladeshi',
        // Guardian
        father_name: '', father_mobile: '', father_occupation: '',
        mother_name: '', mother_mobile: '', mother_occupation: '',
        // Address
        address: '', permanent_address: '',
        // Emergency
        emergency_name: '', emergency_mobile: '',
        // Academic
        last_school: '', jsc_gpa: '', ssc_gpa: ''
    });
    
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/public/courses').then(res => setCourses(res.data));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));

        try {
            const res = await api.post('/admission/submit', data, { headers: { "Content-Type": "multipart/form-data" } });
            setMessage({ type: 'success', text: res.data.message });
            window.scrollTo(0,0);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Submission failed.' });
            window.scrollTo(0,0);
        } finally { setLoading(false); }
    };

    const sectionTitle = "text-xl font-bold text-[#1F4E79] border-b border-gray-200 pb-2 mb-4 mt-6 uppercase tracking-wide";
    const inputClass = "w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-[#1F4E79] text-sm";
    const labelClass = "block text-xs font-bold text-gray-600 mb-1 uppercase";

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 font-sans">
            <div className="max-w-4xl mx-auto bg-white p-8 shadow-md rounded-xl border border-gray-200">
                <h2 className="text-3xl font-bold text-center mb-8 text-[#1F4E79]">Online Admission Form</h2>
                
                {message && (
                    <div className={`p-4 mb-6 rounded text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* 1. Student Information */}
                    <h3 className={sectionTitle}>Student Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                        <div className="md:col-span-2"><label className={labelClass}>Full Name *</label><input name="full_name" className={inputClass} onChange={handleChange} required /></div>
                        <div><label className={labelClass}>Mobile No *</label><input name="phone" className={inputClass} onChange={handleChange} required /></div>
                        <div><label className={labelClass}>Email (For Login) *</label><input name="email" type="email" className={inputClass} onChange={handleChange} required /></div>
                        <div><label className={labelClass}>Date of Birth *</label><input name="dob" type="date" className={inputClass} onChange={handleChange} required /></div>
                        <div><label className={labelClass}>Course *</label>
                            <select name="course_id" className={`${inputClass} bg-white`} onChange={handleChange} required>
                                <option value="">Select</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 2. Personal Details */}
                    <h3 className={sectionTitle}>Personal Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
                        <div><label className={labelClass}>Gender *</label><select name="gender" className={inputClass} onChange={handleChange} required><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                        <div><label className={labelClass}>Religion *</label><select name="religion" className={inputClass} onChange={handleChange} required><option value="Islam">Islam</option><option value="Hindu">Hindu</option><option value="Christian">Christian</option></select></div>
                        <div><label className={labelClass}>Blood Group</label><select name="blood_group" className={inputClass} onChange={handleChange}><option value="">Select</option><option value="A+">A+</option><option value="B+">B+</option><option value="O+">O+</option><option value="AB+">AB+</option></select></div>
                        <div><label className={labelClass}>Nationality</label><input name="nationality" value="Bangladeshi" className={inputClass} onChange={handleChange} /></div>
                    </div>

                    {/* 3. Guardian Information */}
                    <h3 className={sectionTitle}>Guardian Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                        <div><label className={labelClass}>Father's Name *</label><input name="father_name" className={inputClass} onChange={handleChange} required /></div>
                        <div><label className={labelClass}>Father's Mobile *</label><input name="father_mobile" className={inputClass} onChange={handleChange} required /></div>
                        <div><label className={labelClass}>Father's Occupation</label><input name="father_occupation" className={inputClass} onChange={handleChange} /></div>
                        
                        <div className="md:col-span-2 border-t my-2"></div>
                        
                        <div><label className={labelClass}>Mother's Name *</label><input name="mother_name" className={inputClass} onChange={handleChange} required /></div>
                        <div><label className={labelClass}>Mother's Mobile</label><input name="mother_mobile" className={inputClass} onChange={handleChange} /></div>
                        <div><label className={labelClass}>Mother's Occupation</label><input name="mother_occupation" className={inputClass} onChange={handleChange} /></div>
                    </div>

                    {/* 4. Address */}
                    <h3 className={sectionTitle}>Address Info</h3>
                    <div className="grid grid-cols-1 gap-5 mb-4">
                        <div><label className={labelClass}>Present Address *</label><textarea name="address" rows="2" className={inputClass} onChange={handleChange} required></textarea></div>
                        <div><label className={labelClass}>Permanent Address</label><textarea name="permanent_address" rows="2" className={inputClass} onChange={handleChange}></textarea></div>
                    </div>

                    {/* 5. Academic */}
                    <h3 className={sectionTitle}>Academic History</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
                        <div><label className={labelClass}>Last School</label><input name="last_school" className={inputClass} onChange={handleChange} /></div>
                        <div><label className={labelClass}>JSC GPA</label><input name="jsc_gpa" className={inputClass} onChange={handleChange} /></div>
                        <div><label className={labelClass}>SSC GPA</label><input name="ssc_gpa" className={inputClass} onChange={handleChange} /></div>
                    </div>

                    <div className="p-4 rounded-lg border-2 border-dashed border-[#1F4E79]/30 bg-[#1F4E79]/5 mt-6">
                        <label className={labelClass}>Upload Photo</label>
                        <input type="file" accept="image/*" onChange={e => setFormData({...formData, photo: e.target.files[0]})} />
                    </div>

                    <button disabled={loading} type="submit" className="w-full bg-[#1F4E79] text-white font-bold py-4 rounded-lg mt-8 hover:bg-[#163859]">
                        {loading ? 'Processing...' : 'Submit Application'}
                    </button>
                </form>
            </div>
        </div>
    );
}