import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { AlertTriangle, Award, BarChart3, CalendarDays, FileText, Search } from "lucide-react";
import { motion, MotionConfig } from "framer-motion";
import { useNotificationCounts } from "../../context/NotificationContext";
import logger from '../../services/logger';

const percent = (obtained, total) => {
    if (!total) return 0;
    return Math.round((Number(obtained || 0) / Number(total)) * 1000) / 10;
};

// Same bands the backend GradeService uses (A+ ≥80 … D ≥33, F below).
const gradeFor = (percentage) =>
    percentage >= 80 ? 'A+' :
    percentage >= 70 ? 'A' :
    percentage >= 60 ? 'A-' :
    percentage >= 50 ? 'B' :
    percentage >= 40 ? 'C' :
    percentage >= 33 ? 'D' : 'F';

const gradeChipCls = (grade) => {
    if (grade === 'A+') return 'bg-brass-100 text-ink';
    if (grade === 'A' || grade === 'A-') return 'bg-emerald-50 text-emerald-700';
    if (grade === 'B') return 'bg-sky-50 text-sky-700';
    if (grade === 'C' || grade === 'D') return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-700';
};

// Percentage per result, on the same basis the marksheet below uses:
// published subjects the student actually has marks for. The server sends a
// precomputed percentage; the fallback keeps old payloads correct.
// Pure function of the result, so the summary memo stays dependency-clean.
const examPercentage = (result) => {
    if (result.percentage != null) return result.percentage;
    const exam = result.exam || {};
    const allSubjects = exam.subjects || Object.keys(result.marks_details || {});
    const subjectMarks = exam.subject_marks || {};
    const publishedSubjects = exam.is_published
        ? allSubjects
        : (exam.published_subjects || []).filter(s => allSubjects.includes(s));
    const visible = publishedSubjects.filter(s => (result.marks_details || {})[s] !== undefined);
    const obtained = visible.reduce((sum, s) => sum + Number(result.marks_details?.[s] || 0), 0);
    const full = visible.reduce((sum, s) => sum + Number(subjectMarks[s] || 100), 0);
    return percent(obtained, full);
};

const TAB_BASE =
    "inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2";
const tabCls = (active) =>
    `${TAB_BASE} ${active
        ? "bg-ink text-white shadow-sm"
        : "border border-slate-200 bg-white text-slate-600 hover:border-ink/30 hover:text-ink"}`;

export default function StudentResults() {
    const { markViewed } = useNotificationCounts();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [activeType, setActiveType] = useState("monthly");

    useEffect(() => {
        markViewed('exam_results');
    }, [markViewed]);

    // N/§D: distinguish a real load FAILURE from a genuinely empty result set,
    // so a network/server error doesn't masquerade as "no results". Retryable.
    const loadResults = () => {
        setLoading(true);
        api.get("/student/results")
            .then((res) => { setResults(Array.isArray(res.data) ? res.data : []); setError(""); })
            .catch((err) => { logger.error(err); setError(err.response?.data?.message || "Couldn't load your results. Please try again."); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadResults(); }, []);

    const filteredResults = useMemo(() => {
        return results.filter((result) => {
            const type = result.exam?.type || "monthly";
            const query = searchTerm.toLowerCase();
            return type === activeType && (
                result.exam?.name?.toLowerCase().includes(query) ||
                result.exam?.course?.title?.toLowerCase().includes(query)
            );
        });
    }, [results, activeType, searchTerm]);

    const summary = useMemo(() => {
        const typed = results.filter((result) => (result.exam?.type || "monthly") === activeType);
        const percentages = typed.map(examPercentage);
        const average = percentages.length
            ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
            : 0;
        const best = percentages.length ? Math.round(Math.max(...percentages)) : 0;
        return { count: typed.length, average, best };
    }, [results, activeType]);

    const typeLabel = activeType === "mcq" ? "weekly MCQ" : "monthly";
    const onlyError = Boolean(error) && results.length === 0;

    return (
        <MotionConfig reducedMotion="user">
            <div className="min-h-screen bg-white font-sans sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200/70">
                {/* Header — navy title band (segment colour) */}
                <section className="relative overflow-hidden bg-ink text-white">
                    <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "22px 22px" }} aria-hidden="true" />
                    <div className="relative mx-auto max-w-6xl px-4 py-9 text-center sm:px-6 lg:py-11">
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
                            <p className="mb-1 font-bangla text-sm text-brass-100">আমার ফলাফল</p>
                            <h1 className="font-display text-[1.7rem] font-semibold leading-tight sm:text-[2rem]">Exam Results</h1>
                            <div className="mx-auto mt-3 h-px w-12 bg-brass" aria-hidden="true" />
                            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                                Published subject-wise marksheets, exam by exam.
                            </p>
                        </motion.div>
                    </div>
                </section>

                <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
                    {error && !loading && (
                        <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                            <span className="inline-flex items-start gap-2.5">
                                <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <span>{error}</span>
                            </span>
                            <button
                                onClick={loadResults}
                                className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {!onlyError && (
                        <>
                            {/* Summary — tinted pale blue-gray panel */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
                                className="mb-6 rounded-2xl border border-slate-200/80 bg-paper shadow-card"
                            >
                                <div className="grid grid-cols-3 divide-x divide-slate-200/80">
                                    <SummaryTile icon={FileText} label="Published Exams" value={summary.count} />
                                    <SummaryTile icon={BarChart3} label="Average Score" value={summary.count ? `${summary.average}%` : "\u2014"} />
                                    <SummaryTile icon={Award} label="Best Score" value={summary.count ? `${summary.best}%` : "\u2014"} />
                                </div>
                            </motion.div>

                            {/* Search / type toolbar — tinted pale blue-gray panel */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                                className="mb-6 rounded-2xl border border-slate-200/80 bg-paper p-4 shadow-card sm:p-5"
                            >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="relative w-full lg:order-2 lg:w-72">
                                        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(event) => setSearchTerm(event.target.value)}
                                            placeholder="Search exam or course..."
                                            aria-label="Search exam or course"
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-ink focus:ring-2 focus:ring-ink/15"
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 lg:order-1" role="group" aria-label="Result type">
                                        <button type="button" onClick={() => setActiveType("monthly")} aria-pressed={activeType === "monthly"} className={tabCls(activeType === "monthly")}>
                                            Monthly Exams
                                        </button>
                                        <button type="button" onClick={() => setActiveType("mcq")} aria-pressed={activeType === "mcq"} className={tabCls(activeType === "mcq")}>
                                            Weekly MCQ
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-slate-500">Only published results are visible here.</p>
                            </motion.div>

                            {loading ? (
                                <ResultsSkeleton />
                            ) : filteredResults.length > 0 ? (
                                <div className="space-y-4 sm:space-y-5">
                                    {filteredResults.map((result, index) => (
                                        <ResultSheet key={result.id} result={result} index={index} />
                                    ))}
                                </div>
                            ) : (
                                <div className="py-16 text-center sm:py-20">
                                    <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-paper text-slate-400">
                                        <FileText size={30} aria-hidden="true" />
                                    </div>
                                    <h2 className="font-display text-xl font-semibold text-ink">
                                        No published {typeLabel} results found
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {searchTerm ? "Try a different search term." : "Results will appear here once your teachers publish them."}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </MotionConfig>
    );
}

function SummaryTile({ icon: Icon, label, value }) {
    return (
        <div className="flex flex-col items-center gap-1.5 px-2 py-4 text-center sm:px-4 sm:py-5">
            <span className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-ink sm:flex" aria-hidden="true">
                <Icon size={20} />
            </span>
            <p className="font-display text-xl font-semibold text-ink sm:text-2xl">{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[11px]">{label}</p>
        </div>
    );
}

function ResultsSkeleton() {
    return (
        <div>
            <div role="status" className="sr-only">Loading results…</div>
            <div className="space-y-4 sm:space-y-5" aria-hidden="true">
                {[0, 1].map((i) => (
                    <div key={i} className="animate-pulse rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="h-4 w-2/3 rounded bg-slate-200" />
                                <div className="mt-2.5 h-3 w-1/3 rounded-full bg-slate-200" />
                            </div>
                            <div className="flex gap-2">
                                <div className="h-14 w-20 rounded-xl bg-slate-100" />
                                <div className="h-14 w-20 rounded-xl bg-slate-100" />
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                            {[0, 1, 2, 3].map((j) => <div key={j} className="h-16 rounded-xl bg-slate-100" />)}
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="h-11 rounded-xl bg-slate-100" />
                            <div className="h-11 rounded-xl bg-slate-100" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatTile({ label, value, tone = "text-ink" }) {
    return (
        <div className="rounded-xl border border-slate-200/70 bg-paper px-3 py-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-0.5 font-display text-lg font-semibold ${tone}`}>{value}</p>
        </div>
    );
}

function MiniStat({ label, value, tone }) {
    return (
        <div className="min-w-[84px] rounded-xl border border-slate-200/70 bg-paper px-3.5 py-2 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-0.5 font-display text-lg font-semibold ${tone}`}>{value}</p>
        </div>
    );
}

function ResultSheet({ result, index }) {
    const exam = result.exam || {};
    const allSubjects = exam.subjects || Object.keys(result.marks_details || {});
    const subjectMarks = exam.subject_marks || {};

    // Teachers publish results subject by subject. Only published subjects
    // (or all subjects once the whole exam is published) are visible, and a
    // subject appears only if the student actually has marks for it.
    const publishedSubjects = exam.is_published
        ? allSubjects
        : (exam.published_subjects || []).filter(s => allSubjects.includes(s));
    const visibleSubjects = publishedSubjects.filter(s => (result.marks_details || {})[s] !== undefined);
    const partial = !exam.is_published && publishedSubjects.length < allSubjects.length;

    const visibleObtained = visibleSubjects.reduce((sum, s) => sum + Number(result.marks_details?.[s] || 0), 0);
    const visibleFull = visibleSubjects.reduce((sum, s) => sum + Number(subjectMarks[s] || 100), 0);
    const percentage = percent(visibleObtained, visibleFull);
    const grade = gradeFor(percentage);
    const passFail = percentage >= 33 ? 'Pass' : 'Fail';

    const subjectRows = visibleSubjects.map((subject) => {
        const obtained = Number(result.marks_details?.[subject] || 0);
        const full = Number(subjectMarks[subject] || 100);
        const subjectPercent = percent(obtained, full);
        const subjectGrade = gradeFor(subjectPercent);
        return { subject, obtained, full, subjectPercent, subjectGrade };
    });

    return (
        <motion.article
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
            className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold leading-snug text-ink">{exam.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {exam.type === "mcq" ? "Weekly MCQ" : "Monthly"}
                        </span>
                        {exam.course?.title && (
                            <span className="rounded-full bg-brass-100 px-2.5 py-1 text-[11px] font-semibold text-ink">{exam.course.title}</span>
                        )}
                        {exam.date && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <CalendarDays size={13} aria-hidden="true" /> {exam.date}
                            </span>
                        )}
                    </div>
                </div>
                {visibleSubjects.length > 0 && (
                    <div className="flex shrink-0 gap-2">
                        <MiniStat label="Grade" value={grade} tone={grade === 'F' ? 'text-red-600' : 'text-ink'} />
                        <MiniStat label="Status" value={passFail} tone={passFail === 'Pass' ? 'text-emerald-700' : 'text-red-600'} />
                    </div>
                )}
            </div>

            {visibleSubjects.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <StatTile label="Total Marks" value={visibleFull || 0} />
                    <StatTile label="Obtained" value={visibleObtained} />
                    <StatTile label="Position" value={result.position || 'N/A'} />
                    <StatTile label="Percentage" value={`${percentage}%`} />
                </div>
            )}

            {partial && visibleSubjects.length > 0 && (
                <p className="mt-4 rounded-xl border border-brass/40 bg-brass-100 px-3.5 py-2.5 text-xs font-medium text-ink">
                    Some subjects are not published yet — they will appear here once their teachers publish the results.
                </p>
            )}

            {result.teacher_comment && (
                <div className="mt-4 rounded-xl border border-slate-200/70 bg-paper p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Teacher Comment</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{result.teacher_comment}</p>
                </div>
            )}

            {visibleSubjects.length > 0 ? (
                <>
                    {/* Mobile / tablet — labelled stacked rows (no squeezed columns) */}
                    <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 lg:hidden">
                        {subjectRows.map(({ subject, obtained, full, subjectPercent, subjectGrade }) => (
                            <div key={subject} className="flex items-center justify-between gap-3 px-3.5 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-ink">{subject}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Marks: <span className="font-semibold text-ink">{obtained}</span> / {full}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${gradeChipCls(subjectGrade)}`}>{subjectGrade}</span>
                                    <span className={`w-14 text-right text-sm font-bold ${subjectPercent < 33 ? "text-red-600" : "text-ink"}`}>
                                        {subjectPercent}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop — subject-wise table (scrolls inside its own container if ever needed) */}
                    <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-200/80 lg:block">
                        <table className="w-full text-sm">
                            <thead className="bg-paper text-[11px] uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left font-semibold">Subject</th>
                                    <th scope="col" className="px-4 py-3 text-center font-semibold">Marks</th>
                                    <th scope="col" className="px-4 py-3 text-center font-semibold">Full Marks</th>
                                    <th scope="col" className="px-4 py-3 text-center font-semibold">Grade</th>
                                    <th scope="col" className="px-4 py-3 text-center font-semibold">Percentage</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {subjectRows.map(({ subject, obtained, full, subjectPercent, subjectGrade }) => (
                                    <tr key={subject} className="transition-colors hover:bg-paper/60">
                                        <td className="px-4 py-3 font-medium text-ink">{subject}</td>
                                        <td className="px-4 py-3 text-center font-bold text-ink">{obtained}</td>
                                        <td className="px-4 py-3 text-center text-slate-500">{full}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${gradeChipCls(subjectGrade)}`}>{subjectGrade}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`font-bold ${subjectPercent < 33 ? "text-red-600" : "text-ink"}`}>{subjectPercent}%</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-paper px-3.5 py-3 text-xs text-slate-500">
                    {exam.is_published
                        ? "No subject marks are recorded for you in this exam yet."
                        : "No subject results have been published for this exam yet."}
                </p>
            )}
        </motion.article>
    );
}
