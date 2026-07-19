import { useState, useEffect } from "react";
import { GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import api from "../services/api";
import HERO_IMAGE from "../images/hero-background.jpg";

export default function Admission() {
    const [courses, setCourses] = useState([]);
    const [formData, setFormData] = useState({
        full_name: '', email: '', phone: '', dob: '', course_id: '', photo: null,
        gender: '', religion: 'Islam', blood_group: '', nationality: 'Bangladeshi',
        father_name: '', father_mobile: '', father_occupation: '',
        mother_name: '', mother_mobile: '', mother_occupation: '',
        address: '', permanent_address: '',
        emergency_name: '', emergency_mobile: '',
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
            window.scrollTo(0, 0);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Submission failed.' });
            window.scrollTo(0, 0);
        } finally { setLoading(false); }
    };

    const sectionTitle = "text-xl font-bold text-[#1F4E79] border-b border-gray-200 pb-2 mb-4 mt-6 uppercase tracking-wide";
    const inputClass = "w-full border-b border-gray-200 focus:border-[#1F4E79] transition-all outline-none bg-transparent text-sm py-2.5";
    const labelClass = "block text-xs font-bold text-gray-600 mb-1 uppercase";

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Hero Header */}
            <div className="relative overflow-hidden">
                <img src={HERO_IMAGE} alt=""
                    className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#1F4E79]/90 via-[#1F4E79]/85 to-[#1F4E79]/90"></div>
                <div className="max-w-7xl mx-auto px-4 py-16 md:py-20 relative z-10 text-center text-white">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-5 border border-white/20">
                            <GraduationCap size={16} /> Admission
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Online Admission Form</h1>
                        <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                            Fill out the form below to apply for admission at Uttoron Coaching Center.
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 -mt-10 relative z-20 pb-16">
                {message && (
                    <div className={`p-4 mb-6 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-10">
                    <form onSubmit={handleSubmit}>
                        {/* 1. Student Information */}
                        <h3 className={sectionTitle}>Student Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                            <div className="md:col-span-2"><label className={labelClass}>Full Name *</label><input name="full_name" className={inputClass} onChange={handleChange} required /></div>
                            <div><label className={labelClass}>Mobile No *</label><input name="phone" className={inputClass} onChange={handleChange} required /></div>
                            <div><label className={labelClass}>Email (For Login) *</label><input name="email" type="email" className={inputClass} onChange={handleChange} required /></div>
                            <div><label className={labelClass}>Date of Birth *</label><input name="dob" type="date" className={inputClass} onChange={handleChange} required /></div>
                            <div><label className={labelClass}>Course *</label>
                                <select name="course_id" className={`${inputClass} bg-white appearance-none`} onChange={handleChange} required>
                                    <option value="">Select</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* 2. Personal Details */}
                        <h3 className={sectionTitle}>Personal Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
                            <div><label className={labelClass}>Gender *</label><select name="gender" className={`${inputClass} bg-white appearance-none`} onChange={handleChange} required><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                            <div><label className={labelClass}>Religion *</label><select name="religion" className={`${inputClass} bg-white appearance-none`} onChange={handleChange} required><option value="Islam">Islam</option><option value="Hindu">Hindu</option><option value="Christian">Christian</option></select></div>
                            <div><label className={labelClass}>Blood Group</label><select name="blood_group" className={`${inputClass} bg-white appearance-none`} onChange={handleChange}><option value="">Select</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="O+">O+</option><option value="O-">O-</option><option value="AB+">AB+</option><option value="AB-">AB-</option></select></div>
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
                            <div><label className={labelClass}>Present Address *</label><textarea name="address" rows="2" className={inputClass + " resize-none"} onChange={handleChange} required></textarea></div>
                            <div><label className={labelClass}>Permanent Address</label><textarea name="permanent_address" rows="2" className={inputClass + " resize-none"} onChange={handleChange}></textarea></div>
                        </div>

                        {/* 5. Academic */}
                        <h3 className={sectionTitle}>Academic History</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
                            <div><label className={labelClass}>Last School</label><input name="last_school" className={inputClass} onChange={handleChange} /></div>
                            <div><label className={labelClass}>JSC GPA</label><input name="jsc_gpa" className={inputClass} onChange={handleChange} /></div>
                            <div><label className={labelClass}>SSC GPA</label><input name="ssc_gpa" className={inputClass} onChange={handleChange} /></div>
                        </div>

                        <div className="p-4 rounded-xl border-2 border-dashed border-[#1F4E79]/30 bg-[#1F4E79]/5 mt-6">
                            <label className={labelClass}>Upload Photo</label>
                            <input type="file" accept="image/*" onChange={e => setFormData({ ...formData, photo: e.target.files[0] })} className="mt-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1F4E79]/10 file:text-[#1F4E79] hover:file:bg-[#1F4E79]/20" />
                        </div>

                        <button disabled={loading} type="submit"
                            className="w-full rounded-full px-6 py-3 bg-[#1F4E79] text-white font-semibold hover:bg-[#1a3d66] transition-colors mt-8 disabled:opacity-60">
                            {loading ? 'Processing...' : 'Submit Application'}
                        </button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}
