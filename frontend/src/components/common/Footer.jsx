import { useEffect, useState } from "react";
import { Facebook, Instagram, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LOGO_IMAGE from "../../images/hero-background.jpg";

export default function Footer() {
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        api.get("/public/site-settings")
            .then(({ data }) => setSettings(data))
            .catch(() => {});
    }, []);

    const socials = [
        { url: settings?.facebook_url, Icon: Facebook, hover: "hover:bg-blue-600" },
        { url: settings?.youtube_url, Icon: Youtube, hover: "hover:bg-red-600" },
        { url: settings?.twitter_url, Icon: Twitter, hover: "hover:bg-gray-700" },
        { url: settings?.instagram_url, Icon: Instagram, hover: "hover:bg-pink-600" },
    ].filter((social) => social.url);

    return (
        <footer className="bg-gray-900 text-white pt-12 pb-6">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-700 pb-8">
                    <div>
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: '"Tiro Bangla", serif' }}>
                            <img src={LOGO_IMAGE} alt="Logo" className="h-8 w-8 md:h-10 md:w-10 object-contain rounded" /> {settings?.site_name || "উত্তরণ কোচিং সেন্টার"}
                        </h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {settings?.footer_description || "Empowering students through quality education, discipline, concept-based learning, and expert mentorship."}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold mb-4">Quick Links</h3>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link to="/" className="hover:text-white transition">Home</Link></li>
                            <li><Link to="/about" className="hover:text-white transition">About Us</Link></li>
                            <li><Link to="/courses" className="hover:text-white transition">Our Courses</Link></li>
                            <li><Link to="/notices" className="hover:text-white transition">Notices</Link></li>
                            <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold mb-4">Contact Us</h3>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li className="flex items-start gap-3">
                                <MapPin size={18} className="text-blue-500 mt-1 flex-shrink-0" />
                                {settings?.map_link ? (
                                    <a href={settings.map_link} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                                        {settings.address || "Address not set"}
                                    </a>
                                ) : (
                                    <span>{settings?.address || "Address not set"}</span>
                                )}
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone size={18} className="text-blue-500 flex-shrink-0" />
                                {settings?.phone ? (
                                    <a href={`tel:${settings.phone}`} className="hover:text-white transition">{settings.phone}</a>
                                ) : <span>-</span>}
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail size={18} className="text-blue-500 flex-shrink-0" />
                                {settings?.email ? (
                                    <a href={`mailto:${settings.email}`} className="hover:text-white transition">{settings.email}</a>
                                ) : <span>-</span>}
                            </li>
                        </ul>
                        {socials.length > 0 && (
                            <div className="flex gap-4 mt-6">
                                {socials.map(({ url, Icon, hover }) => (
                                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className={`p-2 bg-gray-800 rounded-full transition ${hover}`}>
                                        <Icon size={18} />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center text-gray-500 text-sm pt-6">
                    &copy; {new Date().getFullYear()} {settings?.site_name || "উত্তরণ কোচিং সেন্টার"}. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
