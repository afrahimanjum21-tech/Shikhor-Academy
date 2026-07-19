import { useEffect, useMemo, useState } from "react";
import { Award, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";
import api from "../services/api";
import HERO_IMAGE from "../images/hero-background.jpg";

export default function About() {
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        api.get("/public/site-settings")
            .then(({ data }) => setSettings(data))
            .catch(() => {});
    }, []);

    const content = settings?.about_content || "";
    const { title, subtitle, body } = useMemo(() => splitIntro(content), [content]);

    const stats = [
        { icon: Users, value: settings?.student_count ?? 0, label: "Happy Students", className: "bg-blue-50 border-blue-100 text-blue-700" },
        { icon: Award, value: settings?.years_experience ?? 0, label: "Years Experience", className: "bg-emerald-50 border-emerald-100 text-emerald-700" },
        { icon: TrendingUp, value: settings?.success_rate || "0%", label: "Success Rate", className: "bg-amber-50 border-amber-100 text-amber-700" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white font-sans">
            {/* Hero Header */}
            <div className="relative overflow-hidden">
                <img src={HERO_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#1F4E79]/90 via-[#1F4E79]/85 to-[#1F4E79]/90"></div>
                <div className="max-w-7xl mx-auto px-4 py-16 md:py-20 relative z-10 text-center text-white">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-5 border border-white/20">
                            <Users size={16} /> About Us
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">{title || "About Uttoron Coaching Centre"}</h1>
                        <p className="text-lg text-blue-100 max-w-2xl mx-auto">
                            {subtitle || "Inspiring Excellence. Building Confidence. Shaping the Future."}
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Stats + Content */}
            <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-20 pb-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {stats.map((stat, idx) => (
                        <motion.div key={stat.label}
                            whileInView={{ opacity: 1, y: 0 }}
                            initial={{ opacity: 0, y: 30 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.45, delay: Math.min(idx * 0.1, 0.3) }}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-7 text-center">
                            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${stat.className} mb-4 mx-auto`}>
                                <stat.icon size={28} />
                            </div>
                            <h3 className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</h3>
                            <p className="text-gray-500 font-medium">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    whileInView={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 30 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-10">
                    <MarkdownContent content={body || content} />
                </motion.div>
            </div>
        </div>
    );
}

function splitIntro(content) {
    const lines = content.split(/\r?\n/);
    const titleIndex = lines.findIndex((line) => line.startsWith("# "));
    const subtitleIndex = lines.findIndex((line, index) => index > titleIndex && line.startsWith("## "));

    const title = titleIndex >= 0 ? lines[titleIndex].replace(/^#\s+/, "").trim() : "";
    const subtitle = subtitleIndex >= 0 ? lines[subtitleIndex].replace(/^##\s+/, "").trim() : "";
    const body = lines
        .filter((_, index) => index !== titleIndex && index !== subtitleIndex)
        .join("\n")
        .trim();

    return { title, subtitle, body };
}

function MarkdownContent({ content }) {
    const blocks = parseBlocks(content);

    return (
        <div className="space-y-6 text-gray-700">
            {blocks.map((block, index) => {
                if (block.type === "hr") {
                    return <hr key={index} className="border-gray-200" />;
                }

                if (block.type === "h1") {
                    return <h2 key={index} className="text-3xl font-bold text-[#1F4E79] pt-4">{block.text}</h2>;
                }

                if (block.type === "h2") {
                    return <h3 key={index} className="text-2xl font-bold text-gray-800 pt-2">{block.text}</h3>;
                }

                if (block.type === "ul") {
                    return (
                        <ul key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex gap-3 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
                                    <span className="mt-2 h-2 w-2 rounded-full bg-[#1F4E79] flex-shrink-0" />
                                    <span className="leading-relaxed">{renderInline(item)}</span>
                                </li>
                            ))}
                        </ul>
                    );
                }

                return (
                    <p key={index} className="text-base md:text-lg leading-relaxed">
                        {renderInline(block.text)}
                    </p>
                );
            })}
        </div>
    );
}

function parseBlocks(content) {
    const blocks = [];
    const lines = content.split(/\r?\n/);
    let paragraph = [];
    let list = [];

    const flushParagraph = () => {
        if (paragraph.length) {
            blocks.push({ type: "p", text: paragraph.join(" ") });
            paragraph = [];
        }
    };

    const flushList = () => {
        if (list.length) {
            blocks.push({ type: "ul", items: list });
            list = [];
        }
    };

    lines.forEach((rawLine) => {
        const line = rawLine.trim();

        if (!line) {
            flushParagraph();
            flushList();
            return;
        }

        if (line === "---") {
            flushParagraph();
            flushList();
            blocks.push({ type: "hr" });
            return;
        }

        if (line.startsWith("# ")) {
            flushParagraph();
            flushList();
            blocks.push({ type: "h1", text: line.replace(/^#\s+/, "") });
            return;
        }

        if (line.startsWith("## ")) {
            flushParagraph();
            flushList();
            blocks.push({ type: "h2", text: line.replace(/^##\s+/, "") });
            return;
        }

        if (line.startsWith("* ")) {
            flushParagraph();
            list.push(line.replace(/^\*\s+/, ""));
            return;
        }

        flushList();
        paragraph.push(line);
    });

    flushParagraph();
    flushList();

    return blocks;
}

function renderInline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }

        return <span key={index}>{part}</span>;
    });
}
