import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Upload, ChevronDown, Loader2, CheckCircle2, AlertCircle, FileCheck2, Mail } from "lucide-react";
import { motion, MotionConfig } from "framer-motion";
import api from "../services/api";
import usePageMeta from "../hooks/usePageMeta";

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } } };

const inputCls =
  "w-full h-12 rounded-xl border border-slate-200 bg-paper px-4 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-ink focus:ring-2 focus:ring-ink/15";
const textareaCls =
  "w-full rounded-xl border border-slate-200 bg-paper px-4 py-3 text-sm text-ink shadow-sm outline-none transition resize-none placeholder:text-slate-400 focus:border-ink focus:ring-2 focus:ring-ink/15";
const selectCls = `${inputCls} cursor-pointer appearance-none pr-10`;

function Field({ id, label, required = false, hint, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && <span className="text-brass-600" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SelectWrap({ children }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </div>
  );
}

function SectionCard({ index, title, children }) {
  return (
    <motion.section variants={fadeUp} className="rounded-2xl border border-slate-200/80 bg-paper/95 p-5 shadow-card backdrop-blur-sm sm:p-7">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ink font-display text-sm font-semibold text-white">{index}</span>
        <h2 className="font-display text-lg font-semibold text-ink sm:text-xl">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

export default function Admission() {
  usePageMeta({
    title: "Admission — Shikhor Academy",
    description: "Apply for admission at Shikhor Academy. Fill the online admission form to join HSC, SSC or English courses.",
    path: "/admission",
  });
  const [courses, setCourses] = useState([]);
  const [coursesError, setCoursesError] = useState("");
  const [formData, setFormData] = useState({
    full_name: "", email: "", phone: "", dob: "", course_id: "", photo: null,
    gender: "", religion: "Islam", blood_group: "", nationality: "Bangladeshi",
    father_name: "", father_phone: "", father_occupation: "",
    mother_name: "", mother_phone: "", mother_occupation: "",
    address: "", permanent_address: "",
    emergency_name: "", emergency_phone: "", emergency_relation: "",
    last_school: "", jsc_gpa: "", ssc_gpa: "", subject: "",
  });

  const [subjects, setSubjects] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // N/§D: surface a course-load FAILURE (retryable) instead of silently
  // leaving an empty course dropdown with no explanation.
  const loadCourses = () => {
    api.get("/public/courses")
      .then((res) => { setCourses(Array.isArray(res.data) ? res.data : []); setCoursesError(""); })
      .catch(() => setCoursesError("Couldn't load the course list. Please try again."));
  };

  useEffect(() => {
    loadCourses();
    api.get("/public/faculty/subjects").then((res) => setSubjects(res.data)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formEl = e.target;
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
      // Reset the form ONLY after a confirmed success. On failure (the catch
      // below) the entered data is preserved so the user can simply retry.
      setFormData({
        full_name: "", email: "", phone: "", dob: "", course_id: "", photo: null,
        gender: "", religion: "Islam", blood_group: "", nationality: "Bangladeshi",
        father_name: "", father_phone: "", father_occupation: "",
        mother_name: "", mother_phone: "", mother_occupation: "",
        address: "", permanent_address: "",
        emergency_name: "", emergency_phone: "", emergency_relation: "",
        last_school: "", jsc_gpa: "", ssc_gpa: "", subject: "",
      });
      if (formEl && typeof formEl.reset === "function") formEl.reset();
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
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-sm text-slate-500">
            <Link to="/" className="transition-colors hover:text-ink">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-ink">Admission</span>
          </nav>

          {/* Navy hero */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl bg-ink p-7 text-white sm:p-10"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
              aria-hidden="true"
            />
            <span className="pointer-events-none absolute right-5 top-5 h-10 w-10 rounded-tr-xl border-r-2 border-t-2 border-brass/50" aria-hidden="true" />
            <div className="relative">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brass/30 bg-white/5 py-1.5 pl-2.5 pr-4 text-sm text-brass-100">
                <span className="h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
                ভর্তি চলছে · Admission open
              </span>
              <h1 className="font-display text-[1.9rem] font-semibold leading-tight sm:text-4xl">Online Admission Form</h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Complete the form below to apply for admission at Shikhor Academy.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5">
                <span className="inline-flex items-center gap-2 text-sm text-slate-200"><FileCheck2 size={15} className="text-brass" aria-hidden="true" /> Fields marked * are required</span>
                <span className="inline-flex items-center gap-2 text-sm text-slate-200"><Upload size={15} className="text-brass" aria-hidden="true" /> Recent photo, under 2 MB</span>
                <span className="inline-flex items-center gap-2 text-sm text-slate-200"><Mail size={15} className="text-brass" aria-hidden="true" /> Login emailed after approval</span>
              </div>
            </div>
          </motion.section>

          {/* Status message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="status"
              aria-live="polite"
              className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm font-medium ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message.type === "success"
                ? <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                : <AlertCircle size={18} className="mt-0.5 flex-shrink-0" aria-hidden="true" />}
              <span>{message.text}</span>
            </motion.div>
          )}

          <motion.form
            variants={stagger}
            initial="hidden"
            animate="visible"
            onSubmit={handleSubmit}
            className="mt-6 space-y-5 sm:mt-8 sm:space-y-6"
          >
            {/* Section 1: Student Information */}
            <SectionCard index={1} title="Student Information">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="full_name" label="Full Name" required className="sm:col-span-2">
                  <input id="full_name" name="full_name" placeholder="Enter your full name" className={inputCls} onChange={handleChange} required />
                </Field>
                <Field id="phone" label="Mobile No" required>
                  <input id="phone" name="phone" placeholder="Enter your mobile number" className={inputCls} onChange={handleChange} required />
                </Field>
                <Field id="email" label="Email (for login)" required>
                  <input id="email" name="email" type="email" placeholder="Enter your email address" className={inputCls} onChange={handleChange} required />
                </Field>
                <Field id="dob" label="Date of Birth" required>
                  <input id="dob" name="dob" type="date" className={inputCls} onChange={handleChange} required />
                </Field>
                <Field id="course_id" label="Course" required>
                  <SelectWrap>
                    <select id="course_id" name="course_id" className={selectCls} onChange={handleChange} required>
                      <option value="">Select a course</option>
                      {courses.map((c) => (<option key={c.id} value={c.id}>{c.title}</option>))}
                    </select>
                  </SelectWrap>
                  {coursesError && (
                    <p className="mt-1 text-xs text-red-600">
                      {coursesError}{" "}
                      <button type="button" onClick={loadCourses} className="font-semibold underline">Retry</button>
                    </p>
                  )}
                </Field>
              </div>
            </SectionCard>

            {/* Section 2: Guardian Information */}
            <SectionCard index={2} title="Guardian Information">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="father_name" label="Father's Name" required>
                  <input id="father_name" name="father_name" placeholder="Enter father's name" className={inputCls} onChange={handleChange} required />
                </Field>
                <Field id="father_phone" label="Father's Mobile" required>
                  <input id="father_phone" name="father_phone" placeholder="Enter father's mobile number" className={inputCls} onChange={handleChange} required />
                </Field>
                <Field id="father_occupation" label="Father's Occupation">
                  <input id="father_occupation" name="father_occupation" placeholder="Enter father's occupation" className={inputCls} onChange={handleChange} />
                </Field>
                <div className="my-1 border-t border-slate-100 sm:col-span-2" aria-hidden="true" />
                <Field id="mother_name" label="Mother's Name" required>
                  <input id="mother_name" name="mother_name" placeholder="Enter mother's name" className={inputCls} onChange={handleChange} required />
                </Field>
                <Field id="mother_phone" label="Mother's Mobile">
                  <input id="mother_phone" name="mother_phone" placeholder="Enter mother's mobile number" className={inputCls} onChange={handleChange} />
                </Field>
                <Field id="mother_occupation" label="Mother's Occupation">
                  <input id="mother_occupation" name="mother_occupation" placeholder="Enter mother's occupation" className={inputCls} onChange={handleChange} />
                </Field>
              </div>
            </SectionCard>

            {/* Section 3: Academic Information */}
            <SectionCard index={3} title="Academic Information">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="last_school" label="Last School">
                  <input id="last_school" name="last_school" placeholder="Enter your last school name" className={inputCls} onChange={handleChange} />
                </Field>
                <Field id="jsc_gpa" label="JSC GPA">
                  <input id="jsc_gpa" name="jsc_gpa" placeholder="Enter JSC GPA" className={inputCls} onChange={handleChange} />
                </Field>
                <Field id="ssc_gpa" label="SSC GPA">
                  <input id="ssc_gpa" name="ssc_gpa" placeholder="Enter SSC GPA" className={inputCls} onChange={handleChange} />
                </Field>
                <Field id="subject" label="Subject" required>
                  <SelectWrap>
                    <select id="subject" name="subject" className={selectCls} onChange={handleChange} required>
                      <option value="">Select subject</option>
                      <option value="All">All</option>
                      {subjects.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
                    </select>
                  </SelectWrap>
                </Field>
                <Field id="gender" label="Gender" required>
                  <SelectWrap>
                    <select id="gender" name="gender" className={selectCls} onChange={handleChange} required>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </SelectWrap>
                </Field>
                <Field id="religion" label="Religion" required>
                  <SelectWrap>
                    <select id="religion" name="religion" className={selectCls} onChange={handleChange} required>
                      <option value="Islam">Islam</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Christian">Christian</option>
                    </select>
                  </SelectWrap>
                </Field>
                <Field id="blood_group" label="Blood Group">
                  <SelectWrap>
                    <select id="blood_group" name="blood_group" className={selectCls} onChange={handleChange}>
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
                  </SelectWrap>
                </Field>
                <Field id="nationality" label="Nationality">
                  <input id="nationality" name="nationality" value={formData.nationality} className={inputCls} onChange={handleChange} />
                </Field>
              </div>
            </SectionCard>

            {/* Section 4: Address */}
            <SectionCard index={4} title="Address">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="address" label="Present Address" required>
                  <textarea id="address" name="address" rows="2" placeholder="Enter your present address" className={textareaCls} onChange={handleChange} required />
                </Field>
                <Field id="permanent_address" label="Permanent Address">
                  <textarea id="permanent_address" name="permanent_address" rows="2" placeholder="Enter your permanent address" className={textareaCls} onChange={handleChange} />
                </Field>
              </div>
            </SectionCard>

            {/* Section 5: Emergency Contact */}
            <SectionCard index={5} title="Emergency Contact">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field id="emergency_name" label="Emergency Contact Name">
                  <input id="emergency_name" name="emergency_name" placeholder="Enter emergency contact name" className={inputCls} onChange={handleChange} />
                </Field>
                <Field id="emergency_phone" label="Emergency Contact Phone" required>
                  <input id="emergency_phone" name="emergency_phone" placeholder="Enter emergency contact phone number" className={inputCls} onChange={handleChange} required />
                </Field>
                <Field id="emergency_relation" label="Emergency Contact Relation">
                  <input id="emergency_relation" name="emergency_relation" placeholder="e.g. Father, Mother, Guardian" className={inputCls} onChange={handleChange} />
                </Field>
              </div>
            </SectionCard>

            {/* Section 6: Photo */}
            <SectionCard index={6} title="Photo">
              <Field id="photo" label="Upload Photo" hint="JPG or PNG, under 2 MB.">
                <div className="flex items-center gap-4 rounded-xl border-2 border-dashed border-slate-200 bg-paper/60 p-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink">
                    <Upload size={20} aria-hidden="true" />
                  </div>
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, photo: e.target.files[0] })}
                    className="w-full text-sm text-slate-500 file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-ink/10 file:px-5 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-ink/20"
                  />
                </div>
              </Field>
            </SectionCard>

            {/* Submit */}
            <motion.div variants={fadeUp} className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brass px-10 text-base font-semibold text-ink shadow-sm transition hover:bg-brass-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? (<><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Processing…</>)
                  : (<>Submit Application <ArrowRight size={18} aria-hidden="true" /></>)}
              </button>
              <p className="mt-3 text-center text-xs text-slate-500">By submitting, you confirm the information provided is accurate.</p>
            </motion.div>
          </motion.form>
        </div>
      </div>
    </MotionConfig>
  );
}
