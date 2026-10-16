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
        <footer className="bg-gray-900 pt-7 pb-4 text-white sm:pt-12 sm:pb-6">
            <div className="mx-auto max-w-7xl px-5 sm:px-4">
                <div className="grid grid-cols-2 gap-x-5 gap-y-7 border-b border-gray-700 pb-6 sm:grid-cols-1 sm:gap-6 sm:pb-8 md:grid-cols-3 md:gap-8">
                    <div className="col-span-2 sm:col-span-1">
                        <h2 className="mb-2 flex items-center gap-2 text-lg font-bold sm:mb-4 sm:text-2xl" style={{ fontFamily: '"Tiro Bangla", serif' }}>
                            <img src={LOGO_IMAGE} alt="Logo" className="h-7 w-7 rounded object-contain sm:h-8 sm:w-8 md:h-10 md:w-10" /> {settings?.site_name || "Shikhor Academy"}
                        </h2>
                        <p className="max-w-md text-[13px] leading-[1.65] text-gray-400 sm:text-sm">
                            {settings?.footer_description || "Empowering students through quality education, discipline, concept-based learning, and expert mentorship."}
                        </p>
                    </div>

                    <div>
                        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300 sm:mb-4 sm:text-lg sm:normal-case sm:tracking-normal sm:font-bold">Quick Links</h3>
                        <ul className="space-y-1.5 text-[13px] leading-5 text-gray-400 sm:space-y-2 sm:text-sm">
                            <li><Link to="/" className="block py-0.5 hover:text-white transition">Home</Link></li>
                            <li><Link to="/about" className="block py-0.5 hover:text-white transition">About Us</Link></li>
                            <li><Link to="/courses" className="block py-0.5 hover:text-white transition">Our Courses</Link></li>
                            <li><Link to="/success-stories" className="block py-0.5 hover:text-white transition">Success Stories</Link></li>
                            <li><Link to="/notices" className="block py-0.5 hover:text-white transition">Notices</Link></li>
                            <li><Link to="/contact" className="block py-0.5 hover:text-white transition">Contact</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300 sm:mb-4 sm:text-lg sm:normal-case sm:tracking-normal sm:font-bold">Contact Us</h3>
                        <ul className="space-y-2 text-xs leading-5 text-gray-400 sm:space-y-3 sm:text-sm">
                            <li className="flex min-w-0 items-start gap-2 sm:gap-3">
                                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-blue-500 sm:h-[18px] sm:w-[18px]" />
                                {settings?.map_link ? (
                                    <a href={settings.map_link} target="_blank" rel="noopener noreferrer" className="hover:text-white transition break-words min-w-0">
                                        {settings.address || "Address not set"}
                                    </a>
                                ) : (
                                    <span className="break-words min-w-0">{settings?.address || "Address not set"}</span>
                                )}
                            </li>
                            <li className="flex min-w-0 items-center gap-2 sm:gap-3">
                                <Phone size={16} className="flex-shrink-0 text-blue-500 sm:h-[18px] sm:w-[18px]" />
                                {settings?.phone ? (
                                    <a href={`tel:${settings.phone}`} className="hover:text-white transition break-words min-w-0">{settings.phone}</a>
                                ) : <span>-</span>}
                            </li>
                            <li className="flex min-w-0 items-center gap-2 sm:gap-3">
                                <Mail size={16} className="flex-shrink-0 text-blue-500 sm:h-[18px] sm:w-[18px]" />
                                {settings?.email ? (
                                    <a href={`mailto:${settings.email}`} className="hover:text-white transition break-words min-w-0">{settings.email}</a>
                                ) : <span>-</span>}
                            </li>
                        </ul>
                        {socials.length > 0 && (
                            <div className="mt-3 flex gap-2 sm:mt-6 sm:gap-3">
                                {socials.map(({ url, Icon, hover }) => (
                                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label="Social link" className={`rounded-full bg-gray-800 p-2 transition ${hover}`}>
                                        <Icon size={16} className="sm:h-[18px] sm:w-[18px]" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 text-center text-[11px] text-gray-500 sm:pt-6 sm:text-sm">
                    &copy; {new Date().getFullYear()} {settings?.site_name || "Shikhor Academy"}. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
