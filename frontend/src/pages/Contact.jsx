import { useEffect, useState } from "react";
import api from "../services/api";
import { Loader2, Mail, MapPin, Phone, Clock, Send, ArrowUpRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import usePageMeta from "../hooks/usePageMeta";

const inputCls =
    "h-12 w-full rounded-xl border border-slate-200 bg-paper px-4 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-ink focus:ring-2 focus:ring-ink/15";

export default function Contact() {
    usePageMeta({
        title: "Contact Us — Shikhor Academy",
        description: "Get in touch with Shikhor Academy: location, phone, email and hours. We're happy to answer your questions.",
        path: "/contact",
    });
    const [form, setForm] = useState({ name: "", email: "", subject: "", phone: "", message: "" });
    const [status, setStatus] = useState(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        api.get("/public/site-settings")
            .then(({ data }) => setSettings(data?.data || data))
            .catch(() => {});
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setStatus("sending");
        setStatusMessage("");
        try {
            const { data } = await api.post("/contact", form);
            setStatus("success");
            setStatusMessage(data?.message || "Message sent successfully.");
            setForm({ name: "", email: "", subject: "", phone: "", message: "" });
        } catch (err) {
            setStatus("error");
            setStatusMessage(err.response?.data?.message || "Failed to send message. Please try again.");
        }
    };

    const infoItems = [
        {
            icon: MapPin,
            label: "Address",
            value: settings?.address || "Address not set",
            href: settings?.map_link || undefined,
        },
        {
            icon: Phone,
            label: "Phone",
            value: settings?.phone || "Phone not set",
            href: settings?.phone ? `tel:${settings.phone}` : undefined,
        },
        {
            icon: Mail,
            label: "Email",
            value: settings?.email || "Email not set",
            href: settings?.email ? `mailto:${settings.email}` : undefined,
        },
        { icon: Clock, label: "Office Hours", value: "Sunday — Thursday", sub: "9:00 AM — 5:00 PM" },
    ];

    return (
        <div className="min-h-screen font-sans">
            {/* ===== HERO (navy) ===== */}
            <section className="relative overflow-hidden bg-ink text-white">
                <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
                <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(900px 420px at 15% -10%, rgba(255,255,255,0.08), transparent 60%)" }} aria-hidden="true" />
                <div className="relative mx-auto max-w-5xl px-4 py-12 text-center sm:px-6 lg:py-16">
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                        <p className="mb-2 font-bangla text-sm text-brass-100">যোগাযোগ</p>
                        <h1 className="font-display text-[2rem] font-semibold leading-tight sm:text-4xl lg:text-[2.9rem]">Let&apos;s talk</h1>
                        <div className="mx-auto mt-4 h-px w-14 bg-brass" aria-hidden="true" />
                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                            Whether it&apos;s admission, courses, fees, class schedules, or academic guidance — our team is ready to help you take the next step.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ===== MAIN ===== */}
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 shadow-card-lg">
                    <div className="grid lg:grid-cols-5">
                        {/* Info panel — navy */}
                        <aside className="relative overflow-hidden bg-ink p-7 text-white sm:p-9 lg:col-span-2">
                            <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "20px 20px" }} aria-hidden="true" />
                            <span className="pointer-events-none absolute right-5 top-5 h-10 w-10 rounded-tr-xl border-r-2 border-t-2 border-brass/50" aria-hidden="true" />
                            <div className="relative">
                                <p className="font-bangla text-sm text-brass-100">যোগাযোগের তথ্য</p>
                                <h2 className="mt-1 font-display text-xl font-semibold sm:text-2xl">Contact information</h2>
                                <p className="mt-2 text-sm leading-relaxed text-slate-300">Reach us directly — we usually reply within a day.</p>
                                <div className="mt-7 space-y-5">
                                    {infoItems.map((item) => (
                                        <div key={item.label} className="flex items-start gap-4">
                                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-brass-100">
                                                <item.icon size={18} aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
                                                {item.href ? (
                                                    <a href={item.href} className="mt-0.5 block break-words text-sm font-medium text-white transition-colors hover:text-brass-100">{item.value}</a>
                                                ) : (
                                                    <p className="mt-0.5 break-words text-sm font-medium text-white">{item.value}</p>
                                                )}
                                                {item.sub && <p className="mt-0.5 text-xs leading-snug text-slate-400">{item.sub}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        {/* Form panel — off-white */}
                        <div className="p-6 sm:p-9 lg:col-span-3" style={{ backgroundColor: "#E6ECF4" }}>
                            <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">Send a message</h2>
                            <p className="mt-1 text-sm text-slate-500">Fill out the form and we&apos;ll get back to you within 24 hours.</p>
                            {status === "success" && (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="status" aria-live="polite"
                                    className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                                    <Mail size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" /> <span>{statusMessage}</span>
                                </motion.div>
                            )}
                            {status === "error" && (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="status" aria-live="polite"
                                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                    {statusMessage}
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="c-name" className="mb-1.5 block text-sm font-medium text-ink">Your name <span className="text-brass-600" aria-hidden="true">*</span></label>
                                        <input id="c-name" className={inputCls} placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label htmlFor="c-email" className="mb-1.5 block text-sm font-medium text-ink">Email <span className="text-brass-600" aria-hidden="true">*</span></label>
                                        <input id="c-email" type="email" className={inputCls} placeholder="email@domain.com" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="c-subject" className="mb-1.5 block text-sm font-medium text-ink">Subject <span className="text-brass-600" aria-hidden="true">*</span></label>
                                        <input id="c-subject" className={inputCls} placeholder="What is this regarding?" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                                    </div>
                                    <div>
                                        <label htmlFor="c-phone" className="mb-1.5 block text-sm font-medium text-ink">Phone</label>
                                        <input id="c-phone" className={inputCls} placeholder="+880" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="c-message" className="mb-1.5 block text-sm font-medium text-ink">Message <span className="text-brass-600" aria-hidden="true">*</span></label>
                                    <textarea id="c-message" rows="5" className={`${inputCls} h-auto resize-none py-3`} placeholder="Write your message…" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                                </div>
                                <button disabled={status === "sending"} type="submit"
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brass px-8 font-semibold text-ink shadow-sm transition hover:bg-brass-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                                    {status === "sending" ? (<><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Sending…</>) : (<><Send size={16} aria-hidden="true" /> Send message</>)}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {(() => {
                    if (!settings?.map_embed_url) return null;
                    const coords = settings.map_embed_url.match(/@([-\d.]+),([-\d.]+)/);
                    const embedSrc = settings.map_embed_url.includes('/embed')
                        ? settings.map_embed_url
                        : coords
                            ? `https://www.google.com/maps?q=${coords[1]},${coords[2]}&output=embed`
                            : settings.map_embed_url;
                    return (
                        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="mt-6">
                            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-card">
                                <iframe src={embedSrc} width="100%" height="220" style={{ border: 0, display: "block" }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Our Location" className="md:h-[340px]" />
                                <div className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">Our location</div>
                                {settings?.map_link && (
                                    <a href={settings.map_link} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-brass px-4 py-1.5 text-xs font-semibold text-ink shadow-sm transition hover:bg-brass-600">
                                        Get directions <ArrowUpRight size={13} aria-hidden="true" />
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    );
                })()}
            </div>

            {/* ===== CTA (navy) ===== */}
            {/* __CTA__ */}
        </div>
    );
}
