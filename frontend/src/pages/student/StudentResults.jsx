import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { Award, BarChart3, FileText, Loader2, Search } from "lucide-react";

const percent = (obtained, total) => {
    if (!total) return 0;
    return Math.round((Number(obtained || 0) / Number(total)) * 1000) / 10;
};

export default function StudentResults() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeType, setActiveType] = useState("monthly");

    useEffect(() => {
        api.get("/student/results")
            .then((res) => setResults(res.data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

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
        const average = typed.length
            ? Math.round(typed.reduce((sum, item) => sum + percent(item.total_obtained, item.exam?.total_marks), 0) / typed.length)
            : 0;
        const best = typed.reduce((max, item) => Math.max(max, percent(item.total_obtained, item.exam?.total_marks)), 0);
        return { count: typed.length, average, best };
    }, [results, activeType]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F4E79]">Exam Results</h1>
                    <p className="text-sm text-gray-500">Published subject-wise marksheets</p>
                </div>
                <div className="relative w-full lg:w-72">
                    <input
                        type="text"
                        placeholder="Search exam or course..."
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:border-[#1F4E79] outline-none text-sm bg-white"
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                    <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard icon={FileText} label="Published Exams" value={summary.count} />
                <SummaryCard icon={BarChart3} label="Average Score" value={`${summary.average}%`} />
                <SummaryCard icon={Award} label="Best Score" value={`${summary.best}%`} />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveType("monthly")}
                            className={`px-4 py-2 rounded-md text-sm font-bold ${activeType === "monthly" ? "bg-[#1F4E79] text-white" : "bg-white text-gray-600 border border-gray-200"}`}
                        >
                            Monthly Exams
                        </button>
                        <button
                            onClick={() => setActiveType("mcq")}
                            className={`px-4 py-2 rounded-md text-sm font-bold ${activeType === "mcq" ? "bg-[#1F4E79] text-white" : "bg-white text-gray-600 border border-gray-200"}`}
                        >
                            Weekly MCQ
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">Only published results are visible here.</p>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-[#1F4E79] flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={20} />
                        Loading results...
                    </div>
                ) : filteredResults.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {filteredResults.map((result) => (
                            <ResultSheet key={result.id} result={result} />
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-gray-500">
                        <FileText className="mx-auto mb-3 opacity-30" size={40} />
                        No published {activeType === "mcq" ? "weekly MCQ" : "monthly"} results found.
                    </div>
                )}
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value }) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-[#1F4E79] mt-1">{value}</p>
            </div>
            <div className="h-11 w-11 rounded-lg bg-blue-50 text-[#1F4E79] flex items-center justify-center">
                <Icon size={22} />
            </div>
        </div>
    );
}

function ResultSheet({ result }) {
    const exam = result.exam || {};
    const subjects = exam.subjects || Object.keys(result.marks_details || {});
    const subjectMarks = exam.subject_marks || {};
    const percentage = percent(result.total_obtained, exam.total_marks);

    return (
        <div className="p-4 md:p-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-800">{exam.name}</h3>
                        <span className="px-2 py-1 rounded bg-blue-50 text-[#1F4E79] text-xs font-bold uppercase">
                            {exam.type === "mcq" ? "Weekly MCQ" : "Monthly"}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{exam.course?.title} - {exam.date}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center min-w-72">
                    <MiniStat label="Total" value={`${result.total_obtained}/${exam.total_marks}`} />
                    <MiniStat label="Percent" value={`${percentage}%`} />
                    <MiniStat label="Grade" value={result.grade || "-"} tone={result.grade === "F" ? "text-red-600" : "text-green-700"} />
                </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3 text-left">Subject</th>
                            <th className="px-4 py-3 text-center">Marks</th>
                            <th className="px-4 py-3 text-center">Full Marks</th>
                            <th className="px-4 py-3 text-center">Percentage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {subjects.map((subject) => {
                            const obtained = Number(result.marks_details?.[subject] || 0);
                            const full = Number(subjectMarks[subject] || 100);
                            const subjectPercent = percent(obtained, full);
                            return (
                                <tr key={subject} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-800">{subject}</td>
                                    <td className="px-4 py-3 text-center font-bold text-[#1F4E79]">{obtained}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{full}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`font-bold ${subjectPercent < 33 ? "text-red-600" : "text-gray-700"}`}>
                                            {subjectPercent}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MiniStat({ label, value, tone = "text-[#1F4E79]" }) {
    return (
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-gray-500">{label}</p>
            <p className={`text-sm font-bold mt-1 ${tone}`}>{value}</p>
        </div>
    );
}
