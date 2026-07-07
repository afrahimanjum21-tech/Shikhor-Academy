import { useState } from "react";
import api from "../services/api";
import { MapPin, Phone, Mail, Send } from "lucide-react";

export default function Contact() {
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [status, setStatus] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        try {
            await api.post('/contact', form);
            setStatus('success');
            setForm({ name: '', email: '', subject: '', message: '' });
        } catch (err) {
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans py-12 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    
                    {/* Info */}
                    <div>
                        <h1 className="text-4xl font-bold mb-6" style={{ color: '#1F4F78' }}>Get in Touch</h1>
                        <p className="text-gray-600 mb-8 text-lg">
                            Have questions about admission or our courses? Feel free to contact us.
                        </p>
                        
                        <div className="space-y-6">
                            {[
                                { icon: MapPin, title: "Our Location", text: "Mirpur-10, Dhaka, Bangladesh" },
                                { icon: Phone, title: "Phone Number", text: "+880 1700-000000" },
                                { icon: Mail, title: "Email Address", text: "info@uttoron.com" }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-[#1F4F78] transition">
                                    <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(31, 79, 120, 0.1)', color: '#1F4F78' }}>
                                        <item.icon />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{item.title}</h3>
                                        <p className="text-gray-600">{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Send Message</h2>
                        
                        {status === 'success' && <div className="bg-green-50 text-green-700 p-3 rounded mb-4 border border-green-200">Message Sent!</div>}
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-[#1F4F78] transition" placeholder="Your Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            <input className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-[#1F4F78] transition" placeholder="Email Address" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                            <input className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-[#1F4F78] transition" placeholder="Subject" required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
                            <textarea className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-[#1F4F78] transition" placeholder="Message..." rows="4" required value={form.message} onChange={e => setForm({...form, message: e.target.value})}></textarea>
                            
                            <button disabled={status === 'sending'} className="w-full text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg" style={{ backgroundColor: '#1F4F78' }}>
                                <Send size={18} /> {status === 'sending' ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}