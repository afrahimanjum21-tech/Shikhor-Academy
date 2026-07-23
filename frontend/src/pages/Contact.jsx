import { useEffect, useState } from "react";
import api from "../services/api";
import { Loader2, Mail, MapPin, Phone, Clock, Send, ArrowUpRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import HERO_IMAGE from "../images/hero-background.jpg";
import PageBackground from "../components/common/PageBackground";

export default function Contact() {
    const [form, setForm] = useState({ name: "", email: "", subject: "", phone: "", message: "" });
    const [status, setStatus] = useState(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        api.get("/public/site-settings")
            .then(({ data }) => setSettings(data))
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
        { icon: MapPin, label: "Address", value: "Harabhanga, Gangni, Meherpur", sub: "Harabhanga EIDGA (In front of Harabhanga EIDGA)" },
        { icon: Phone, label: "Phone", value: "+880 1804630810", href: "tel:+8801804630810" },
        { icon: Mail, label: "Email", value: "afrahimanjum01@gmail.com", href: "mailto:afrahimanjum01@gmail.com" },
        { icon: Clock, label: "Office Hours", value: "Sunday — Thursday", sub: "9:00 AM — 5:00 PM" },
    ];

    const floatingCards = [
        { icon: MapPin, title: "Address", body: "Harabhanga, Gangni,\nMeherpur", sub: "Harabhanga EIDGA\n(In front of Harabhanga EIDGA)" },
        { icon: Phone, title: "Phone", body: "+880 1804630810", href: "tel:+8801804630810" },
        { icon: Mail, title: "Email", body: "afrahimanjum01@gmail.com", href: "mailto:afrahimanjum01@gmail.com" },
        { icon: Clock, title: "Office Hours", body: "Sunday — Thursday", sub: "9:00 AM — 5:00 PM" },
    ];

    const fadeUp = {
        initial: { opacity: 0, y: 30 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-40px" },
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <PageBackground />
            {/* ===== PAGE HEADER ===== */}
            <div className="max-w-[1200px] mx-auto px-4 md:px-10 pt-12 pb-6 text-center">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex flex-col lg:flex-row items-center gap-6 lg:justify-between">
                        <div className="flex-1 text-center lg:text-left">
                            <h1 className="text-[34px] sm:text-[42px] md:text-[48px] font-bold text-[#1F4E79] mb-3">Reach Us</h1>
                            <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto lg:mx-0">
                                We're here to help you build your future. Whether you have questions about admission, courses, fees, class schedules, or academic guidance, our team is ready to assist you.
                            </p>
                        </div>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }} className="flex-shrink-0">
                            <div className="w-[130px] h-[130px] sm:w-[170px] sm:h-[170px] rounded-full overflow-hidden" style={{ border: "1px solid #D9EAF8" }}>
                                <img src={HERO_IMAGE} alt="Uttoron Coaching Center" className="w-full h-full object-cover" />
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>

            {/* ===== FLOATING CARDS ===== */}
            <section className="max-w-[1200px] mx-auto px-4 md:px-10 mb-8 md:mb-14">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    {floatingCards.map((card, i) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: i * 0.06 }}
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                            className="rounded-xl p-4 md:p-5 transition-all duration-300"
                            style={{
                                background: "rgba(255,255,255,0.8)",
                                backdropFilter: "blur(10px)",
                                WebkitBackdropFilter: "blur(10px)",
                                border: "1px solid rgba(217,234,248,0.6)",
                                boxShadow: "0 4px 20px -6px rgba(18,63,115,0.05)"
                            }}
                        >
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: "#D9EAF8" }}>
                                <card.icon size={16} style={{ color: "#123F73" }} />
                            </div>
                            <p className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-1" style={{ color: "#6B7B8C", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{card.title}</p>
                            {card.href ? (
                                <a href={card.href} className="text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: "#123F73" }}>{card.body}</a>
                            ) : (
                                <>
                                    <p className="text-sm font-semibold leading-snug" style={{ color: "#243B53" }}>{card.body}</p>
                                    {card.sub && <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "#6B7B8C" }}>{card.sub}</p>}
                                </>
                            )}
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ===== MAIN SECTION ===== */}
            <section className="max-w-[1200px] mx-auto px-4 md:px-10 pb-14" id="form">
                <div className="flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-14">
                    {/* ---- FORM ---- */}
                    <motion.div className="flex-1 lg:max-w-[58%]" {...fadeUp} transition={{ duration: 0.4 }}>
                        <div className="rounded-xl md:rounded-2xl p-5 md:p-8" style={{ backgroundColor: "#FFFFFF", boxShadow: "0 2px 30px -8px rgba(18,63,115,0.05)" }}>
                            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: "#6B7B8C", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Inquiry</p>
                            <h2 className="text-xl md:text-[28px] font-bold leading-tight mb-1" style={{ color: "#123F73", fontFamily: "'Poppins', sans-serif" }}>Send a Message</h2>
                            <p className="text-xs md:text-sm mb-5 md:mb-6" style={{ color: "#6B7B8C" }}>Fill out the form below and we'll get back to you within 24 hours.</p>

                            {status === "success" && (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border mb-4 text-xs" style={{ backgroundColor: "#E8F5E9", borderColor: "#A5D6A7", color: "#2E7D32" }}>
                                    <Mail size={14} className="shrink-0" /> {statusMessage}
                                </motion.div>
                            )}
                            {status === "error" && (
                                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="px-3.5 py-2.5 rounded-lg border mb-4 text-xs" style={{ backgroundColor: "#FFEBEE", borderColor: "#EF9A9A", color: "#C62828" }}>
                                    {statusMessage}
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "#6B7B8C", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your Name</label>
                                        <input className="w-full px-3.5 text-sm rounded-lg transition-all duration-300" style={{ height: "48px", backgroundColor: "#F8FBFF", border: "1px solid #D9EAF8", color: "#243B53", outline: "none" }} placeholder="Full Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onFocus={(e) => e.target.style.borderColor = "#2E86C1"} onBlur={(e) => e.target.style.borderColor = "#D9EAF8"} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "#6B7B8C", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Email Address</label>
                                        <input className="w-full px-3.5 text-sm rounded-lg transition-all duration-300" style={{ height: "48px", backgroundColor: "#F8FBFF", border: "1px solid #D9EAF8", color: "#243B53", outline: "none" }} placeholder="email@domain.com" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onFocus={(e) => e.target.style.borderColor = "#2E86C1"} onBlur={(e) => e.target.style.borderColor = "#D9EAF8"} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4">
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "#6B7B8C", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Subject</label>
                                        <input className="w-full px-3.5 text-sm rounded-lg transition-all duration-300" style={{ height: "48px", backgroundColor: "#F8FBFF", border: "1px solid #D9EAF8", color: "#243B53", outline: "none" }} placeholder="What is this regarding?" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} onFocus={(e) => e.target.style.borderColor = "#2E86C1"} onBlur={(e) => e.target.style.borderColor = "#D9EAF8"} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "#6B7B8C", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Phone Number</label>
                                        <input className="w-full px-3.5 text-sm rounded-lg transition-all duration-300" style={{ height: "48px", backgroundColor: "#F8FBFF", border: "1px solid #D9EAF8", color: "#243B53", outline: "none" }} placeholder="+880" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} onFocus={(e) => e.target.style.borderColor = "#2E86C1"} onBlur={(e) => e.target.style.borderColor = "#D9EAF8"} />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] mb-1" style={{ color: "#6B7B8C", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Message</label>
                                    <textarea className="w-full px-3.5 py-2.5 text-sm rounded-lg transition-all duration-300 resize-none" style={{ height: "120px", backgroundColor: "#F8FBFF", border: "1px solid #D9EAF8", color: "#243B53", outline: "none" }} placeholder="Write your message..." required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} onFocus={(e) => e.target.style.borderColor = "#2E86C1"} onBlur={(e) => e.target.style.borderColor = "#D9EAF8"} />
                                </div>
                                <button disabled={status === "sending"} className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed shadow-md" style={{ backgroundColor: "#123F73", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {status === "sending" ? <Loader2 size={15} className="animate-spin" /> : <><Send size={15} /> Send Message</>}
                                </button>
                            </form>
                        </div>
                    </motion.div>

                    {/* ---- INFO PANEL ---- */}
                    <motion.div className="flex-1 lg:max-w-[38%]" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.05 }}>
                        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-1" style={{ color: "#6B7B8C", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Contact Information</p>
                        <h2 className="text-xl md:text-[28px] font-bold leading-tight mb-1" style={{ color: "#123F73", fontFamily: "'Poppins', sans-serif" }}>Need Immediate Help?</h2>
                        <p className="text-xs md:text-sm mb-5" style={{ color: "#6B7B8C" }}>Our team is ready to assist you.</p>

                        <div className="space-y-3">
                            {infoItems.map((item, i) => (
                                <motion.div key={item.label} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.06 }} className="flex items-start gap-3 p-3.5 rounded-lg" style={{ backgroundColor: "#FFFFFF", border: "1px solid #D9EAF8" }}>
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#D9EAF8" }}>
                                        <item.icon size={16} style={{ color: "#123F73" }} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-0.5" style={{ color: "#6B7B8C", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.label}</p>
                                        {item.href ? (
                                            <a href={item.href} className="text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: "#123F73" }}>{item.value}</a>
                                        ) : (
                                            <p className="text-sm font-semibold leading-snug" style={{ color: "#243B53" }}>{item.value}</p>
                                        )}
                                        {item.sub && <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "#6B7B8C" }}>{item.sub}</p>}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                    </motion.div>
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
                    <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.15 }} className="mt-8">
                        <div className="relative rounded-xl overflow-hidden" style={{ boxShadow: "0 2px 20px -6px rgba(18,63,115,0.05)" }}>
                            <iframe src={embedSrc} width="100%" height="220" style={{ border: 0, display: "block" }} allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Our Location" className="md:h-[320px]" />
                            <div className="absolute top-3 left-3 px-3 py-1 rounded-md text-[10px] font-semibold tracking-[0.1em] uppercase shadow-sm" style={{ backgroundColor: "#FFFFFF", color: "#123F73", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Our Location</div>
                            {settings?.map_link && (
                                <a href={settings.map_link} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md text-[10px] font-semibold shadow-sm transition-all hover:scale-[1.03]" style={{ backgroundColor: "#123F73", color: "#FFFFFF", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    Get Directions <ArrowUpRight size={12} />
                                </a>
                            )}
                        </div>
                    </motion.div>
                    );
                })()}
            </section>

            {/* ===== CTA ===== */}
            <section className="max-w-[1200px] mx-auto px-4 md:px-10 pb-14">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="rounded-xl md:rounded-2xl px-6 md:px-8 py-10 md:py-14 text-center" style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
                    <p className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-2" style={{ color: "#6B7B8C", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Next Steps</p>
                    <h2 className="text-xl md:text-[28px] font-bold mb-2" style={{ color: "#123F73", fontFamily: "'Poppins', sans-serif" }}>Ready to Begin?</h2>
                    <p className="text-xs md:text-sm max-w-lg mx-auto mb-5" style={{ color: "#6B7B8C" }}>Contact us today to start your admission process or learn more about our programs.</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <a href="tel:+8801804630810" className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg hover:scale-[1.03] transition-all duration-300 shadow-sm" style={{ backgroundColor: "#123F73", color: "#FFFFFF", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            <Phone size={14} /> Call Us
                        </a>
                        <a href="mailto:afrahimanjum01@gmail.com" className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg border-2 hover:scale-[1.03] transition-all duration-300" style={{ color: "#123F73", borderColor: "#123F73", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            <Mail size={14} /> Email Us
                        </a>
                    </div>
                </motion.div>
            </section>

            <div className="pb-10" />
        </div>
    );
}