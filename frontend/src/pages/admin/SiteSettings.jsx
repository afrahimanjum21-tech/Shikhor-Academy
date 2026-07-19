import { useEffect, useState } from "react";
import api from "../../services/api";
import {
    Building2,
    CheckCircle2,
    Globe,
    Info,
    KeyRound,
    Loader2,
    Lock,
    MailCheck,
    MapPin,
    Save,
    Send,
} from "lucide-react";

const defaultForm = {
    site_name: "Uttoron Coaching Center",
    home_hero_title: "Learn with confidence. Succeed with Uttoron.",
    home_hero_subtitle: "Concept-based coaching, regular evaluation, and supportive guidance for every student.",
    footer_description: "Empowering students through quality education, discipline, concept-based learning, and expert mentorship.",
    address: "",
    map_link: "",
    map_embed_url: "",
    phone: "",
    email: "",
    facebook_url: "",
    youtube_url: "",
    twitter_url: "",
    instagram_url: "",
    about_content: "",
    student_count: 0,
    years_experience: 0,
    success_rate: "0%",
    admission_email: "",
    messages_email: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: "587",
    smtp_username: "",
    smtp_password: "",
    smtp_from_address: "",
    smtp_from_name: "Uttoron Coaching Center",
    smtp_encryption: "tls",
};

export default function SiteSettings() {
    const [form, setForm] = useState(defaultForm);
    const [hasSmtpPassword, setHasSmtpPassword] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/admin/site-settings")
            .then((res) => {
                setForm({ ...defaultForm, ...res.data, smtp_password: "" });
                setHasSmtpPassword(Boolean(res.data.has_smtp_password));
            })
            .catch((err) => setError(err.response?.data?.message || "Unable to load site settings"))
            .finally(() => setLoading(false));
    }, []);

    const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const save = async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const payload = { ...form };
            if (!payload.smtp_password) delete payload.smtp_password;

            const { data } = await api.post("/admin/site-settings", payload);
            setForm({ ...defaultForm, ...data.settings, smtp_password: "" });
            setHasSmtpPassword(Boolean(data.settings?.has_smtp_password));
            setMessage(data.message || "Site settings saved");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save site settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-10 text-center text-[#1F4E79] flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Loading site settings...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79] flex items-center gap-2">
                        <Building2 size={26} /> Site Settings
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage public institute information, location, email routing, and editable page content.
                    </p>
                </div>
                <div className={`rounded-lg border px-4 py-3 text-sm font-bold flex items-center gap-2 ${hasSmtpPassword ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    <MailCheck size={16} />
                    {hasSmtpPassword ? "Email configured" : "Email not configured"}
                </div>
            </div>

            {message && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 md:px-4 py-2 md:py-3 text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle2 size={16} /> {message}
                </div>
            )}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 md:px-4 py-2 md:py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <form onSubmit={save} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <Section icon={<KeyRound size={20} />} title="Email Configuration (SMTP)" subtitle="This Gmail account sends all system emails.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="SMTP Host" value={form.smtp_host || ""} onChange={(v) => update("smtp_host", v)} placeholder="smtp.gmail.com" />
                            <Field label="SMTP Port" value={form.smtp_port || ""} onChange={(v) => update("smtp_port", v)} placeholder="587" />
                            <Field label="Sender Gmail Address" value={form.smtp_username || ""} onChange={(v) => update("smtp_username", v)} placeholder="your-email@gmail.com" />
                            <Field
                                label="Gmail App Password (16-character)"
                                type="password"
                                value={form.smtp_password}
                                onChange={(v) => update("smtp_password", v)}
                                placeholder={hasSmtpPassword ? "Saved. Enter a new password to replace it" : "Paste your 16-character App Password"}
                                maxLength={32}
                            />
                            <Field label="From Address" value={form.smtp_from_address || ""} onChange={(v) => update("smtp_from_address", v)} placeholder="your-email@gmail.com" />
                            <Field label="From Name" value={form.smtp_from_name || ""} onChange={(v) => update("smtp_from_name", v)} placeholder="Uttoron Coaching Center" />
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Encryption</label>
                                <select
                                    value={form.smtp_encryption || "tls"}
                                    onChange={(e) => update("smtp_encryption", e.target.value)}
                                    className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F4E79] bg-white"
                                >
                                    <option value="tls">TLS</option>
                                    <option value="ssl">SSL</option>
                                    <option value="none">None</option>
                                </select>
                            </div>
                        </div>

                        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 leading-relaxed">
                            <strong>Gmail App Password:</strong> Google Account, Security, 2-Step Verification, App Passwords, then create one for Mail. Your normal Gmail password will <strong>not</strong> work.
                        </div>
                    </Section>

                    <Section icon={<MailCheck size={20} />} title="Notification Emails" subtitle="Choose where incoming admission requests and contact messages will arrive.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Admission Request Email" value={form.admission_email || ""} onChange={(v) => update("admission_email", v)} placeholder="admin@uttoron.com" />
                            <Field label="Contact Messages Email" value={form.messages_email || ""} onChange={(v) => update("messages_email", v)} placeholder="afrahimanjum21@gmail.com" />
                        </div>
                    </Section>

                    <Section icon={<Info size={20} />} title="Home & Footer Content" subtitle="Editable public text shown on the home page and footer.">
                        <Field label="Home Hero Title" value={form.home_hero_title || ""} onChange={(v) => update("home_hero_title", v)} />
                        <Field label="Home Hero Subtitle" value={form.home_hero_subtitle || ""} onChange={(v) => update("home_hero_subtitle", v)} textarea />
                        <Field label="Footer Description" value={form.footer_description || ""} onChange={(v) => update("footer_description", v)} textarea />
                    </Section>

                    <Section icon={<MapPin size={20} />} title="Contact Information" subtitle="Shown on the Contact page and footer.">
                        <Field label="Site Name" value={form.site_name || ""} onChange={(v) => update("site_name", v)} />
                        <Field label="Address" value={form.address || ""} onChange={(v) => update("address", v)} textarea />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Phone" value={form.phone || ""} onChange={(v) => update("phone", v)} />
                            <Field label="Public Email" value={form.email || ""} onChange={(v) => update("email", v)} />
                        </div>
                        <Field label="Map Link" value={form.map_link || ""} onChange={(v) => update("map_link", v)} />
                        <Field label="Map Embed URL" value={form.map_embed_url || ""} onChange={(v) => update("map_embed_url", v)} textarea />
                    </Section>

                    <Section icon={<Building2 size={20} />} title="About Page Stats" subtitle="Counters shown on the About page.">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Field label="Student Count" type="number" value={form.student_count ?? ""} onChange={(v) => update("student_count", v)} />
                            <Field label="Years Experience" type="number" value={form.years_experience ?? ""} onChange={(v) => update("years_experience", v)} />
                            <Field label="Success Rate" value={form.success_rate || ""} onChange={(v) => update("success_rate", v)} placeholder="95%" />
                        </div>
                    </Section>

                    <Section icon={<Globe size={20} />} title="Social Media" subtitle="Links shown in the footer.">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Facebook URL" value={form.facebook_url || ""} onChange={(v) => update("facebook_url", v)} />
                            <Field label="YouTube URL" value={form.youtube_url || ""} onChange={(v) => update("youtube_url", v)} />
                            <Field label="Twitter / X URL" value={form.twitter_url || ""} onChange={(v) => update("twitter_url", v)} />
                            <Field label="Instagram URL" value={form.instagram_url || ""} onChange={(v) => update("instagram_url", v)} />
                        </div>
                    </Section>

                    <Section icon={<Info size={20} />} title="About Us Content" subtitle="This markdown content is shown directly on the public About page.">
                        <textarea
                            value={form.about_content || ""}
                            onChange={(e) => update("about_content", e.target.value)}
                            rows="18"
                            className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F4E79] font-mono"
                            placeholder="About us content / markdown..."
                        />
                    </Section>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 h-fit space-y-4 xl:sticky xl:top-4">
                    <div className="h-11 w-11 rounded-lg bg-blue-50 text-[#1F4E79] flex items-center justify-center">
                        <Send size={22} />
                    </div>
                    <h2 className="font-bold text-gray-800">How Emails Work</h2>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        <strong>Step 1:</strong> Enter the same Gmail address that generated the 16-character App Password.
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        <strong>Step 2:</strong> Set separate inboxes for admission applications and contact messages.
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        <strong>Step 3:</strong> Save. Public forms will send notifications to the configured inboxes.
                    </p>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500 leading-relaxed">
                        <Lock size={12} className="inline mr-1" />
                        The app password is never shown again after it is saved.
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded bg-[#1F4E79] px-4 py-3 text-sm font-bold text-white hover:bg-[#163859] disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Settings
                    </button>
                </div>
            </form>
        </div>
    );
}

function Section({ icon, title, subtitle, children }) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="h-10 w-10 rounded-lg bg-[#1F4E79]/10 text-[#1F4E79] flex items-center justify-center">
                    {icon}
                </div>
                <div>
                    <h2 className="font-bold text-gray-800">{title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

function Field({ label, value, onChange, required = false, placeholder = "", textarea = false, type = "text", maxLength }) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{label}</label>
            {textarea ? (
                <textarea
                    value={value}
                    required={required}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    rows="2"
                    className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F4E79]"
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    required={required}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-[#1F4E79]"
                />
            )}
        </div>
    );
}
