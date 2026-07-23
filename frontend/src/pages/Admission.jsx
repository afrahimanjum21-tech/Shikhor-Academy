import { useState, useEffect } from "react";
import { ArrowRight, Upload } from "lucide-react";
import { motion } from "framer-motion";
import api from "../services/api";
import PageBackground from "../components/common/PageBackground";

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const inputGlass = {
  background: "#FFFFFF",
  border: "1px solid #CBD5E1",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  color: "#1E293B",
};

const glassInput =
  "w-full h-[60px] px-5 rounded-[18px] text-sm outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]";

const glassTextarea =
  "w-full h-[140px] px-5 py-4 rounded-[18px] text-sm outline-none transition-all duration-200 placeholder:text-gray-400 resize-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]";

const glassSelect =
  "w-full h-[60px] px-5 rounded-[18px] text-sm outline-none transition-all duration-200 focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] appearance-none cursor-pointer";

const sectionLabel =
  "block text-sm font-semibold text-[#174B87] mb-2";

const sectionTitle =
  "text-[28px] font-bold text-[#174B87] pb-3 mb-7 border-b border-[rgba(37,99,235,0.15)]";

export default function Admission() {
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    full_name: "", email: "", phone: "", dob: "", course_id: "", photo: null,
    gender: "", religion: "Islam", blood_group: "", nationality: "Bangladeshi",
    father_name: "", father_mobile: "", father_occupation: "",
    mother_name: "", mother_mobile: "", mother_occupation: "",
    address: "", permanent_address: "",
    emergency_name: "", emergency_mobile: "",
    last_school: "", jsc_gpa: "", ssc_gpa: "",
  });

  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/public/courses").then((res) => setCourses(res.data));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.photo && formData.photo.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Please reduce the photo size. The Photo must be smaller than 2 MB." });
      setLoading(false);
      window.scrollTo(0, 0);
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null && formData[key] !== undefined) {
        data.append(key, formData[key]);
      }
    });

    try {
      const res = await api.post("/admission/submit", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage({ type: "success", text: res.data.message });
      window.scrollTo(0, 0);
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Submission failed. Please ensure your photo is smaller than 2 MB.",
      });
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <PageBackground />
      {/* ── Page Header ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <nav className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
            <a href="/" className="hover:text-[#1F4E79] transition-colors">Home</a>
            <span>/</span>
            <span className="text-[#1F4E79] font-medium">Admission</span>
          </nav>

          <h1 className="text-[34px] sm:text-[40px] font-bold text-[#1F4E79] tracking-[-1px] leading-tight">
            Online Admission Form
          </h1>

          <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto mt-3 leading-relaxed">
            Complete the form below to apply for admission at Uttoron Coaching Centre.
          </p>
        </motion.div>
      </div>

      {/* ── Form Section (no white card, inputs float on background) ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 pb-20">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 mb-8 rounded-[18px] text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50/80 backdrop-blur-sm text-green-700 border border-green-200/60"
                : "bg-red-50/80 backdrop-blur-sm text-red-700 border border-red-200/60"
            }`}
          >
            {message.text}
          </motion.div>
        )}

        <motion.form
          variants={stagger}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* ── Section 1: Student Information ── */}
          <motion.div variants={fadeUp}>
            <h2 className={sectionTitle}>Student Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={sectionLabel}>Full Name *</label>
                <input
                  name="full_name"
                  placeholder="Enter your full name"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className={sectionLabel}>Mobile No *</label>
                <input
                  name="phone"
                  placeholder="Enter your mobile number"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className={sectionLabel}>Email (For Login) *</label>
                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className={sectionLabel}>Date of Birth *</label>
                <input
                  name="dob"
                  type="date"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className={sectionLabel}>Course *</label>
                <div className="relative">
                  <select
                    name="course_id"
                    className={glassSelect}
                    style={inputGlass}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-[#1F4E79]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Section 2: Guardian Information ── */}
          <motion.div variants={fadeUp}>
            <h2 className={sectionTitle}>Guardian Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={sectionLabel}>Father's Name *</label>
                <input
                  name="father_name"
                  placeholder="Enter father's name"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className={sectionLabel}>Father's Mobile *</label>
                <input
                  name="father_mobile"
                  placeholder="Enter father's mobile number"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className={sectionLabel}>Father's Occupation</label>
                <input
                  name="father_occupation"
                  placeholder="Enter father's occupation"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                />
              </div>
              <div className="border-t border-[#1F4E79]/5 my-1 md:col-span-2" />
              <div>
                <label className={sectionLabel}>Mother's Name *</label>
                <input
                  name="mother_name"
                  placeholder="Enter mother's name"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className={sectionLabel}>Mother's Mobile</label>
                <input
                  name="mother_mobile"
                  placeholder="Enter mother's mobile number"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={sectionLabel}>Mother's Occupation</label>
                <input
                  name="mother_occupation"
                  placeholder="Enter mother's occupation"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                />
              </div>
            </div>
          </motion.div>

          {/* ── Section 3: Academic Information ── */}
          <motion.div variants={fadeUp}>
            <h2 className={sectionTitle}>Academic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={sectionLabel}>Last School</label>
                <input
                  name="last_school"
                  placeholder="Enter your last school name"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={sectionLabel}>JSC GPA</label>
                <input
                  name="jsc_gpa"
                  placeholder="Enter JSC GPA"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={sectionLabel}>SSC GPA</label>
                <input
                  name="ssc_gpa"
                  placeholder="Enter SSC GPA"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={sectionLabel}>Gender *</label>
                <div className="relative">
                  <select
                    name="gender"
                    className={glassSelect}
                    style={inputGlass}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-[#1F4E79]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className={sectionLabel}>Religion *</label>
                <div className="relative">
                  <select
                    name="religion"
                    className={glassSelect}
                    style={inputGlass}
                    onChange={handleChange}
                    required
                  >
                    <option value="Islam">Islam</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Christian">Christian</option>
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-[#1F4E79]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className={sectionLabel}>Blood Group</label>
                <div className="relative">
                  <select
                    name="blood_group"
                    className={glassSelect}
                    style={inputGlass}
                    onChange={handleChange}
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                    <svg
                      className="w-4 h-4 text-[#1F4E79]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className={sectionLabel}>Nationality</label>
                <input
                  name="nationality"
                  value="Bangladeshi"
                  className={glassInput}
                  style={inputGlass}
                  onChange={handleChange}
                />
              </div>
            </div>
          </motion.div>

          {/* ── Section 4: Additional Information ── */}
          <motion.div variants={fadeUp}>
            <h2 className={sectionTitle}>Additional Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={sectionLabel}>Present Address *</label>
                <textarea
                  name="address"
                  rows="2"
                  placeholder="Enter your present address"
                  className={glassTextarea}
                  style={inputGlass}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className={sectionLabel}>Permanent Address</label>
                <textarea
                  name="permanent_address"
                  rows="2"
                  placeholder="Enter your permanent address"
                  className={glassTextarea}
                  style={inputGlass}
                  onChange={handleChange}
                />
              </div>
            </div>
          </motion.div>

          {/* ── Section 5: Photo Upload ── */}
          <motion.div variants={fadeUp}>
            <div
              className="rounded-[18px] p-6"
              style={{
                background: "#FFFFFF",
                border: "2px dashed #CBD5E1",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <label className={sectionLabel}>Upload Photo</label>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-12 h-12 rounded-full bg-[#1F4E79]/5 flex items-center justify-center flex-shrink-0">
                  <Upload size={20} className="text-[#1F4E79]" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({ ...formData, photo: e.target.files[0] })
                  }
                  className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1F4E79]/10 file:text-[#1F4E79] hover:file:bg-[#1F4E79]/20 file:transition-colors file:cursor-pointer"
                />
              </div>
            </div>
          </motion.div>

          {/* ── Submit ── */}
          <motion.div variants={fadeUp} className="pt-4">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 12px 35px rgba(31,78,121,0.3)" }}
              whileTap={{ scale: 0.97 }}
              disabled={loading}
              type="submit"
              className="w-full bg-[#1F4E79] text-white px-10 h-[60px] rounded-[18px] font-bold text-lg shadow-lg hover:bg-[#163859] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  Submit Application
                  <ArrowRight size={20} />
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.form>
      </div>
    </div>
  );
}
