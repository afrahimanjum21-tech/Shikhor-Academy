import { useEffect, useMemo, useState } from "react";
import { Award, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";
import api from "../services/api";
import { buildAssetUrl } from "../services/config";
import usePageMeta from "../hooks/usePageMeta";

export default function About() {
    usePageMeta({
        title: "About Us — Shikhor Academy",
        description: "Learn about Shikhor Academy: our mission, experienced teachers, modern facilities, and years of helping students succeed in HSC and SSC.",
        path: "/about",
    });
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        api.get("/public/site-settings")
            .then(({ data }) => setSettings(data))
            .catch(() => {});
    }, []);

    const content = settings?.about_content || "";
    const { title, subtitle, body } = useMemo(() => splitIntro(content), [content]);
    const { intro, sections } = useMemo(() => splitSections(body || content), [body, content]);

    const stats = useMemo(() => {
        const studentCount = Number(settings?.real_student_count ?? settings?.student_count ?? 0);
        const establishedYear = Number(settings?.established_year ?? 0);
        const years = establishedYear > 0
            ? Math.max(new Date().getFullYear() - establishedYear, 0)
            : Number(settings?.years_experience ?? 0);
        const successRate = Number(settings?.success_rate ?? 0);

        return [
            { icon: Users, value: studentCount, label: "Happy students" },
            { icon: Award, value: years, label: "Years of experience" },
            { icon: TrendingUp, value: `${successRate}%`, label: "Success rate" },
        ];
    }, [settings]);

    return (
        <div className="min-h-screen bg-paper font-sans">
            {/* Header — navy band (segment colour) */}
            <section className="relative overflow-hidden bg-ink text-white">
                <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
                <div className="relative mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 lg:py-12">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
                        <p className="mb-1 font-bangla text-sm text-brass-100">আমাদের সম্পর্কে</p>
                        <h1 className="font-display text-[1.7rem] font-semibold leading-tight sm:text-[2rem]">{title || "About Shikhor Academy"}</h1>
                        <div className="mx-auto mt-3 h-px w-12 bg-brass" aria-hidden="true" />
                        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
                            {subtitle || "Inspiring excellence, building confidence, and shaping the future — one student at a time."}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Stats — the only cards on this page */}
            <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                    {stats.map((stat, idx) => (
                        <motion.div key={stat.label}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.45, delay: Math.min(idx * 0.1, 0.3) }}
                            className="rounded-2xl border border-slate-200/80 bg-paper p-4 text-center shadow-card sm:p-7">
                            <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-white sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl">
                                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                            </div>
                            <h3 className="font-display text-xl font-bold text-ink sm:text-3xl">{stat.value}</h3>
                            <p className="mt-0.5 text-xs font-medium leading-tight text-slate-500 sm:mt-1 sm:text-base">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Content — editorial, alternating text + photo, no cards */}
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
                {intro && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ duration: 0.45 }}
                        className="mx-auto mb-16 max-w-6xl">
                        <MarkdownContent content={intro} />
                    </motion.div>
                )}

                <div className="space-y-16 lg:space-y-24">
                    {sections.slice(0, 3).map((section, idx) => {
                        const flip = idx % 2 === 1;
                        const photoPath = settings?.[`about_photo_${idx + 1}`];
                        return (
                            <motion.div key={`${section.heading}-${idx}`}
                                initial={{ opacity: 0, y: 28 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-60px" }}
                                transition={{ duration: 0.5 }}
                                className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${flip && photoPath ? "lg:[&>div:first-child]:order-2" : ""}`}>
                                <div>
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brass">
                                        0{idx + 1} / Our foundation
                                    </p>
                                    {section.heading && (
                                        <>
                                            <h2 className="font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">{section.heading}</h2>
                                            <div className="mt-4 h-px w-12 bg-brass" aria-hidden="true" />
                                        </>
                                    )}
                                    <div className="mt-6">
                                        <MarkdownContent content={section.body} />
                                    </div>
                                    <Subsections
                                        subsections={section.subsections}
                                        featuredPhotoPath={idx === 1 && sections.length < 3 ? settings?.about_photo_3 : null}
                                    />
                                </div>
                                {photoPath && (
                                    <div className={flip ? "lg:order-1" : ""}>
                                        <PhotoSlot path={photoPath} alt={section.heading ? `${section.heading} photo` : "About Shikhor Academy"} />
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}

                    {sections.length > 3 && (
                        <motion.section
                            initial={{ opacity: 0, y: 28 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-60px" }}
                            transition={{ duration: 0.5 }}
                            aria-labelledby="additional-sections-heading"
                        >
                            <div className="mb-10 max-w-2xl">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-brass">The Shikhor approach</p>
                                <h2 id="additional-sections-heading" className="font-display text-3xl font-semibold leading-tight text-ink md:text-4xl">
                                    More about the Shikhor learning experience.
                                </h2>
                                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                                    Explore the principles, support, and practices that shape our approach.
                                </p>
                            </div>
                            <div className="columns-1 gap-x-10 md:columns-2">
                                {sections.slice(3).map((section, idx) => (
                                    <article
                                        key={`${section.heading}-${idx + 3}`}
                                        className="mb-12 break-inside-avoid border-t border-slate-300 pt-8 sm:pt-10"
                                    >
                                        <div className="mb-5 flex items-center gap-4">
                                            <span className="font-sans text-xs font-semibold tracking-[0.18em] text-brass">
                                                {String(idx + 4).padStart(2, "0")}
                                            </span>
                                            <span className="h-px w-8 bg-brass" aria-hidden="true" />
                                        </div>
                                        {section.heading && (
                                            <h3 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                                                {section.heading}
                                            </h3>
                                        )}
                                        {section.body && (
                                            <div className="mt-5 max-w-3xl">
                                                <MarkdownContent content={section.body} />
                                            </div>
                                        )}
                                        <Subsections subsections={section.subsections} />
                                    </article>
                                ))}
                            </div>
                        </motion.section>
                    )}

                    {!intro && sections.length === 0 && (
                        <div className="mx-auto max-w-3xl">
                            <MarkdownContent content={body || content} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PhotoSlot({ path, alt = "About Shikhor Academy" }) {
    return (
        <div className="relative">
            <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-ink-700">
                <img
                    src={buildAssetUrl(path)}
                    alt={alt}
                    className="relative z-10 block h-auto max-h-[34rem] w-full object-contain"
                />
            </div>
            <span className="pointer-events-none absolute -right-2 -top-2 h-12 w-12 rounded-tr-2xl border-r-2 border-t-2 border-brass/60 sm:-right-3 sm:-top-3 sm:h-14 sm:w-14" aria-hidden="true" />
        </div>
    );
}

function Subsections({ subsections, featuredPhotoPath }) {
    if (!subsections?.length) return null;

    return (
        <div className="mt-8 max-w-4xl space-y-8 border-l border-brass/50 pl-5 sm:pl-8">
            {subsections.map((subsection, subsectionIndex) => (
                <div key={`${subsection.heading}-${subsectionIndex}`} className={featuredPhotoPath && subsectionIndex === 0 ? "grid items-center gap-8 lg:grid-cols-2" : ""}>
                    <div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-xs font-semibold tracking-[0.14em] text-brass">
                                {String(subsectionIndex + 1).padStart(2, "0")}
                            </span>
                            <h4 className="font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">
                                {subsection.heading}
                            </h4>
                        </div>
                        <div className="mt-3">
                            <MarkdownContent content={subsection.body} />
                        </div>
                    </div>
                    {featuredPhotoPath && subsectionIndex === 0 && (
                        <PhotoSlot path={featuredPhotoPath} alt={`${subsection.heading || "Our Approach"} photo`} />
                    )}
                </div>
            ))}
        </div>
    );
}

function splitSections(content) {
    const lines = (content || "").split(/\r?\n/);
    const introLines = [];
    const sections = [];
    let current = null;

    lines.forEach((rawLine) => {
        const trimmed = rawLine.trim();
        const headingMatch = /^##\s+(.*)$/.exec(trimmed);
        const heading = headingMatch ? headingMatch[1].trim() : null;
        const subheadingMatch = /^#{3,4}\s+(.*)$/.exec(trimmed);
        const subheading = subheadingMatch ? subheadingMatch[1].trim() : null;

        if (heading) {
            current = { heading, bodyLines: [], subsections: [] };
            sections.push(current);
        } else if (subheading && current) {
            current.subsections.push({ heading: subheading, lines: [] });
        } else if (current) {
            const activeSubsection = current.subsections[current.subsections.length - 1];
            if (activeSubsection) activeSubsection.lines.push(rawLine);
            else current.bodyLines.push(rawLine);
        } else {
            introLines.push(rawLine);
        }
    });

    return {
        intro: introLines.join("\n").trim(),
        sections: sections
            .map((section) => ({
                heading: section.heading,
                body: section.bodyLines.join("\n").trim(),
                subsections: section.subsections.map((subsection) => ({
                    heading: subsection.heading,
                    body: subsection.lines.join("\n").trim(),
                })).filter((subsection) => subsection.heading || subsection.body),
            }))
            .filter((section) => section.heading || section.body || section.subsections.length),
    };
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

function MarkdownContent({ content, className = "" }) {
    const blocks = parseBlocks(content);

    return (
        <div className={`space-y-5 text-slate-600 ${className}`.trim()}>
            {blocks.map((block, index) => {
                if (block.type === "hr") {
                    return <hr key={index} className="border-slate-200" />;
                }

                if (block.type === "h1") {
                    return <h3 key={index} className="font-display text-xl font-semibold text-ink pt-2 md:text-2xl">{block.text}</h3>;
                }

                if (block.type === "h2") {
                    return <h4 key={index} className="font-display text-lg font-semibold text-ink pt-1 md:text-xl">{block.text}</h4>;
                }

                if (block.type === "h3") {
                    return <h5 key={index} className="font-display text-xl font-semibold leading-tight text-ink pt-2 md:text-2xl">{block.text}</h5>;
                }

                if (block.type === "h4") {
                    return <h6 key={index} className="font-display text-lg font-semibold leading-tight text-ink pt-1 md:text-xl">{block.text}</h6>;
                }

                if (block.type === "ul") {
                    return (
                        <ul key={index} className="space-y-2.5">
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex gap-3">
                                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brass" />
                                    <span className="leading-relaxed">{renderInline(item)}</span>
                                </li>
                            ))}
                        </ul>
                    );
                }

                return (
                    <p key={index} className="text-base leading-relaxed text-slate-600">
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

        if (line.startsWith("#### ")) {
            flushParagraph();
            flushList();
            blocks.push({ type: "h4", text: line.replace(/^####\s+/, "") });
            return;
        }

        if (line.startsWith("### ")) {
            flushParagraph();
            flushList();
            blocks.push({ type: "h3", text: line.replace(/^###\s+/, "") });
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

        if (line.startsWith("* ") || line.startsWith("- ")) {
            flushParagraph();
            list.push(line.replace(/^[*-]\s+/, ""));
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
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={index} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
        }

        if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
            return <em key={index}>{part.slice(1, -1)}</em>;
        }

        return <span key={index}>{part}</span>;
    });
}
