import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    AlertTriangle,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock,
    ExternalLink,
    Loader2,
    MessageCircle,
    RefreshCw,
    Users,
    X,
} from "lucide-react";
import api from "../../services/api";
import notify from "../../services/notification";
import { responsePayload } from "./attendanceResponse";
import { batchCourseId, batchCourseTitle, withoutStudentWhatsAppLink } from "./attendanceState";

const STATUS_LABELS = {
    present: "Present",
    absent: "Absent",
    late: "Late",
    leave: "Leave",
};

const todayInDhaka = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

const FILTER_STORAGE_PREFIX = "ucc_attendance_filters_";

// Restore the last class/batch the user picked. Values are always stored as
// strings so they match the <select> values exactly. Bad/legacy JSON is ignored
// instead of breaking the page.
const readStoredFilters = (key) => {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        return {
            courseId: typeof parsed.courseId === "string" ? parsed.courseId : "",
            batchId: typeof parsed.batchId === "string" ? parsed.batchId : "",
        };
    } catch {
        return {};
    }
};


const sessionInDhaka = () => {
    const hour = Number(new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dhaka",
        hour: "2-digit",
        hourCycle: "h23",
    }).format(new Date()));
    return hour < 12 ? "morning" : "evening";
};

// `window.open()` must be called directly inside the click handler. Waiting for
// the attendance API first consumes the browser's user activation, so the
// WhatsApp tab is blocked as a popup. Open a preparation tab synchronously and
// navigate it once the server confirms the save and returns the wa.me link.
const openPreparationTab = () => {
    try {
        const tab = window.open("", "_blank");
        if (!tab) return null;
        try {
            tab.document.title = "WhatsApp";
            tab.document.body.innerHTML =
                '<p style="font-family:system-ui,sans-serif;padding:24px;color:#334155">Preparing the WhatsApp message…</p>';
        } catch {
            // The tab is still usable even if the placeholder cannot be written.
        }
        return tab;
    } catch {
        return null;
    }
};

const closePreparationTab = (tab) => {
    try {
        tab?.close();
    } catch {
        // The user may already have closed it.
    }
};

const navigatePreparationTab = (tab, url) => {
    if (!tab || !url || tab.closed) return false;
    try {
        // Sever the opener before leaving this origin.
        try {
            tab.opener = null;
        } catch {
            // Ignore: navigation below still works.
        }
        tab.location.href = url;
        return true;
    } catch {
        return false;
    }
};

function StatusBadge({ status }) {
    if (!status) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-500">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                Not marked
            </span>
        );
    }
    const styles = {
        present: "border-emerald-200 bg-emerald-50 text-emerald-700",
        absent: "border-rose-200 bg-rose-50 text-rose-700",
        late: "border-amber-200 bg-amber-50 text-amber-700",
        leave: "border-violet-200 bg-violet-50 text-violet-700",
    };
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[status] || "border-gray-200 bg-gray-50 text-gray-600"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {STATUS_LABELS[status] || status}
        </span>
    );
}

function AttendanceButton({ status, active, disabled, saving, onClick }) {
    const present = status === "present";
    const Icon = present ? Check : X;
    const activeStyles = present
        ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
        : "border-rose-600 bg-rose-600 text-white shadow-sm";
    const idleStyles = present
        ? "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
        : "border-rose-200 bg-white text-rose-700 hover:border-rose-400 hover:bg-rose-50";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={active}
            aria-label={`Mark ${present ? "present" : "absent"}`}
            className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 md:min-w-[92px] ${active ? activeStyles : idleStyles}`}
        >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
            {present ? "Present" : "Absent"}
        </button>
    );
}

function SaveFeedback({ result, mode }) {
    if (!result) return null;

    const prepared = Boolean(result.whatsapp_url);
    const studentName = result.student?.name || result.studentName || "Student";
    const status = result.attendance?.status || result.requestedStatus;
    const profileUrl = mode === "admin" && result.student?.user_id
        ? `/admin/students/${result.student.user_id}/profile`
        : null;

    return (
        <div className={`rounded-xl border p-4 ${prepared ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${prepared ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {prepared ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${prepared ? "text-emerald-900" : "text-amber-900"}`}>
                            {studentName} saved as {STATUS_LABELS[status] || status}
                        </p>
                        {prepared ? (
                            <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                                {result.opened
                                    ? "A WhatsApp tab was opened with the guardian number and bilingual message. Review it and press Send in WhatsApp."
                                    : "Your browser blocked the automatic tab. Open the prepared message below; the attendance is already saved."}
                            </p>
                        ) : (
                            <p className="mt-1 text-xs leading-relaxed text-amber-800">
                                Attendance was saved, but WhatsApp could not be prepared
                                {result.notification?.reason ? `: ${result.notification.reason}` : "."} Nothing was sent.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {prepared && result.whatsapp_url && (
                        <a
                            href={result.whatsapp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1F4E79] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#163859]"
                        >
                            <MessageCircle size={14} />
                            {result.opened ? "Open WhatsApp again" : "Open WhatsApp"}
                        </a>
                    )}
                    {!prepared && profileUrl && (
                        <Link
                            to={profileUrl}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100"
                        >
                            Update guardian number
                            <ExternalLink size={13} />
                        </Link>
                    )}
                </div>
            </div>

            {!prepared && !profileUrl && (
                <p className="mt-2 border-t border-amber-200 pt-2 text-[11px] text-amber-800">
                    Ask an administrator to update this student&apos;s guardian phone in the student profile. The attendance remains saved.
                </p>
            )}
        </div>
    );
}

function SaveError({ message, onDismiss }) {
    if (!message) return null;

    return (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-600" />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-rose-900">Attendance save was not confirmed</p>
                <p className="mt-1 text-xs leading-relaxed text-rose-800">
                    {message} No WhatsApp message was opened. Check the row status and try again.
                </p>
            </div>
            <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 rounded-md p-1 text-rose-500 hover:bg-rose-100 hover:text-rose-700"
                aria-label="Dismiss save error"
            >
                <X size={16} />
            </button>
        </div>
    );
}

export default function ManualAttendancePanel({ mode = "admin" }) {
    const isAdmin = mode === "admin";
    const filterStorageKey = `${FILTER_STORAGE_PREFIX}${mode}`;
    const [courses, setCourses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [courseId, setCourseId] = useState(() => readStoredFilters(filterStorageKey).courseId || "");
    const [batchId, setBatchId] = useState(() => readStoredFilters(filterStorageKey).batchId || "");
    const [date, setDate] = useState(todayInDhaka);
    const [session, setSession] = useState(sessionInDhaka);
    const [sheet, setSheet] = useState(null);
    const [filtersLoading, setFiltersLoading] = useState(true);
    const [filtersError, setFiltersError] = useState("");
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState("");
    const [savingId, setSavingId] = useState(null);
    const [saveError, setSaveError] = useState("");
    const [lastResult, setLastResult] = useState(null);
    const [whatsappLinks, setWhatsappLinks] = useState({});
    const requestSequence = useRef(0);

    // Remember the class/batch selection across page refreshes.
    useEffect(() => {
        try {
            window.localStorage.setItem(filterStorageKey, JSON.stringify({ courseId, batchId }));
        } catch {
            // Private mode/storage disabled — the in-memory selection still works.
        }
    }, [batchId, courseId, filterStorageKey]);

    const loadFilters = useCallback(async () => {
        setFiltersLoading(true);
        setFiltersError("");
        try {
            if (isAdmin) {
                const [courseResponse, batchResponse] = await Promise.all([
                    api.get("/admin/courses", { cache: false }),
                    api.get("/admin/batches", { cache: false }),
                ]);
                setCourses(Array.isArray(courseResponse.data) ? courseResponse.data : []);
                setBatches(Array.isArray(batchResponse.data) ? batchResponse.data : []);
            } else {
                const response = await api.get("/teacher/batches", { cache: false });
                const unique = [];
                const seen = new Set();
                (Array.isArray(response.data) ? response.data : []).forEach((assignment) => {
                    if (assignment?.batch_id && !seen.has(assignment.batch_id)) {
                        seen.add(assignment.batch_id);
                        unique.push({
                            id: assignment.batch_id,
                            name: assignment.name,
                            course_id: assignment.course?.id ?? null,
                            course_title: assignment.course?.title ?? null,
                        });
                    }
                });
                setBatches(unique);
            }
        } catch (error) {
            setFiltersError(error.response?.data?.message || "Failed to load classes and batches.");
        } finally {
            setFiltersLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        loadFilters();
    }, [loadFilters]);

    const visibleBatches = useMemo(() => {
        if (!isAdmin) return batches;
        if (!courseId) return [];
        return batches.filter((batch) => String(batchCourseId(batch)) === String(courseId));
    }, [batches, courseId, isAdmin]);

    const selectedBatch = useMemo(
        () => visibleBatches.find((batch) => String(batch.id) === String(batchId)) || null,
        [batchId, visibleBatches],
    );

    // Drop a restored selection that no longer exists (deleted batch/course or
    // a class change since the preference was saved) instead of querying with
    // stale IDs and showing a confusing error.
    useEffect(() => {
        if (filtersLoading || filtersError) return;

        if (isAdmin && courseId && !courses.some((course) => String(course.id) === String(courseId))) {
            setCourseId("");
            setBatchId("");
            return;
        }

        const availableBatches = isAdmin ? visibleBatches : batches;
        if (batchId && !availableBatches.some((batch) => String(batch.id) === String(batchId))) {
            setBatchId("");
        }
    }, [batches, batchId, courseId, courses, filtersError, filtersLoading, isAdmin, visibleBatches]);

    const loadStudents = useCallback(async () => {
        if (!selectedBatch || !date) {
            requestSequence.current += 1;
            setSheet(null);
            setListLoading(false);
            setListError("");
            return;
        }

        const sequence = requestSequence.current + 1;
        requestSequence.current = sequence;
        setListLoading(true);
        setListError("");
        try {
            const response = await api.get(
                isAdmin ? "/admin/attendance/daily" : "/teacher/attendance/daily",
                {
                    cache: false,
                    params: {
                        batch_id: batchId,
                        date,
                        session,
                        ...(isAdmin ? { course_id: courseId } : {}),
                    },
                },
            );
            if (requestSequence.current !== sequence) return;
            setSheet(responsePayload(response));
        } catch (error) {
            if (requestSequence.current !== sequence) return;
            setSheet(null);
            setListError(error.response?.data?.message || "Failed to load students for this batch.");
        } finally {
            if (requestSequence.current === sequence) setListLoading(false);
        }
    }, [batchId, courseId, date, isAdmin, selectedBatch, session]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    useEffect(() => {
        setLastResult(null);
        setSaveError("");
        setWhatsappLinks({});
    }, [batchId, courseId, date, session]);

    const handleCourseChange = (value) => {
        setCourseId(value);
        setBatchId("");
        setSheet(null);
    };

    const handleBatchChange = (value) => {
        setBatchId(value);
        setSheet(null);
    };

    const handleMark = async (student, status) => {
        if (savingId || !sheet?.batch?.id) return;

        // Open synchronously (still inside the click gesture) so browsers do not
        // block the tab. It is navigated or closed after the save resolves.
        const whatsappTab = openPreparationTab();

        setSavingId(student.id);
        setSaveError("");
        setLastResult(null);
        // A link from an earlier save belongs to the earlier status/number.
        // Drop it while this save is in flight so a failed or guardian-less
        // save can never leave a stale "WhatsApp" action on the row.
        setWhatsappLinks((previous) => withoutStudentWhatsAppLink(previous, student.id));

        let data;
        try {
            const payload = {
                student_id: student.id,
                batch_id: sheet.batch.id,
                date: sheet.date,
                session: sheet.session,
                status,
            };
            if (isAdmin) payload.course_id = sheet.batch.course_id;

            const response = await api.post(
                isAdmin ? "/admin/attendance/manual" : "/teacher/attendance/manual",
                payload,
            );
            data = responsePayload(response);
            if (!data || !data.attendance) {
                throw new Error("The server did not confirm the attendance save.");
            }
        } catch (error) {
            closePreparationTab(whatsappTab);
            const message = error.response?.data?.message || "The save could not be confirmed.";
            setSaveError(message);
            notify.error(message);
            setSavingId(null);
            return;
        }

        // The save is confirmed from here on. Local UI/WhatsApp-window problems
        // must never be reported as a failed attendance save.
        const opened = navigatePreparationTab(whatsappTab, data.whatsapp_url);
        if (!opened) closePreparationTab(whatsappTab);
        try {
            setSheet((previous) => previous ? {
                ...previous,
                students: (previous.students || []).map((row) => (
                    row.id === student.id
                        ? {
                            ...row,
                            attendance: data.attendance,
                            guardian_available: data.guardian?.available ?? row.guardian_available,
                            guardian_masked: data.guardian?.masked ?? row.guardian_masked,
                            guardian_source: data.guardian?.source ?? row.guardian_source,
                            guardian_source_label: data.guardian?.source_label ?? row.guardian_source_label,
                        }
                        : row
                )),
            } : previous);

            if (data.whatsapp_url) {
                setWhatsappLinks((previous) => ({ ...previous, [student.id]: data.whatsapp_url }));
            }

            setLastResult({
                ...data,
                studentName: student.name,
                requestedStatus: status,
                opened,
            });

            if (data.whatsapp_url) {
                notify.success(opened
                    ? "Attendance saved and WhatsApp opened. Send the message manually."
                    : "Attendance saved. Use the WhatsApp button to open the prepared message.");
            } else {
                notify.warning("Attendance saved, but no valid guardian number is available for WhatsApp.");
            }
        } finally {
            setSavingId(null);
        }
    };

    const filtersDisabled = Boolean(savingId);

    const counts = useMemo(() => {
        const students = sheet?.students || [];
        return students.reduce((total, student) => {
            const status = student.attendance?.status;
            if (status === "present") total.present += 1;
            else if (status === "absent") total.absent += 1;
            else total.unmarked += 1;
            return total;
        }, { present: 0, absent: 0, unmarked: 0 });
    }, [sheet]);

    const batchLabel = selectedBatch
        ? [batchCourseTitle(selectedBatch), selectedBatch.name].filter(Boolean).join(" — ")
        : "";

    return (
        <div className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-[#F8FAFC] to-white px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1F4E79]/10 text-[#1F4E79]">
                            <CalendarDays size={19} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Daily Manual Attendance</h2>
                            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                                Save each student first; WhatsApp is prepared only after the server confirms the save.
                            </p>
                        </div>
                    </div>
                    <span className="inline-flex self-start rounded-full border border-[#1F4E79]/15 bg-[#1F4E79]/5 px-3 py-1 text-[11px] font-bold text-[#1F4E79] md:self-auto">
                        শিখর একাডেমি — Shikhar Academy
                    </span>
                </div>

                <div className="p-4 md:p-5">
                    {filtersLoading ? (
                        <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
                            <Loader2 size={17} className="animate-spin text-[#1F4E79]" />
                            Loading classes and batches...
                        </div>
                    ) : filtersError ? (
                        <div className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
                            <span>{filtersError}</span>
                            <button
                                type="button"
                                onClick={loadFilters}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                            >
                                <RefreshCw size={13} /> Retry
                            </button>
                        </div>
                    ) : (
                        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                            {isAdmin && (
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Class / Course</span>
                                    <select
                                        value={courseId}
                                        onChange={(event) => handleCourseChange(event.target.value)}
                                        disabled={filtersDisabled}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15 disabled:cursor-not-allowed disabled:bg-gray-100"
                                    >
                                        <option value="">Select class</option>
                                        {courses.map((course) => (
                                            <option key={course.id} value={course.id}>{course.title}</option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
                                    {isAdmin ? "Batch" : "Class & Batch"}
                                </span>
                                <select
                                    value={batchId}
                                    onChange={(event) => handleBatchChange(event.target.value)}
                                    disabled={filtersDisabled || (isAdmin && !courseId)}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <option value="">{isAdmin && !courseId ? "Select a class first" : "Select batch"}</option>
                                    {visibleBatches.map((batch) => (
                                        <option key={batch.id} value={batch.id}>
                                            {isAdmin
                                                ? batch.name
                                                : [batchCourseTitle(batch), batch.name].filter(Boolean).join(" — ")}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Attendance date</span>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(event) => setDate(event.target.value)}
                                    disabled={filtersDisabled}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Session</span>
                                <select
                                    value={session}
                                    onChange={(event) => setSession(event.target.value)}
                                    disabled={filtersDisabled}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#1F4E79] focus:ring-2 focus:ring-[#1F4E79]/15 disabled:cursor-not-allowed disabled:bg-gray-100"
                                >
                                    <option value="morning">Morning</option>
                                    <option value="evening">Evening</option>
                                </select>
                            </label>
                        </div>
                    )}

                    {!filtersLoading && !filtersError && (
                        (isAdmin && courseId && visibleBatches.length === 0)
                        || (!isAdmin && batches.length === 0)
                    ) && (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            {isAdmin
                                ? "This class has no batches yet. Create a batch in Batch Management first."
                                : "No batches are assigned to your account. Ask an administrator to assign one."}
                        </p>
                    )}

                    {!filtersLoading && !filtersError && selectedBatch && (
                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
                            <span className="font-semibold text-gray-700">{batchLabel}</span>
                            <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {date}</span>
                            <span className="inline-flex items-center gap-1 capitalize"><Clock size={12} /> {session}</span>
                        </div>
                    )}
                </div>
            </section>

            <SaveFeedback result={lastResult} mode={mode} />
            <SaveError message={saveError} onDismiss={() => setSaveError("")} />

            {!batchId || !date ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                    <Users size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-700">Select a batch and date</p>
                    <p className="mt-1 text-xs text-gray-400">Eligible students and their current attendance will appear here.</p>
                </div>
            ) : listLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-12 text-sm font-medium text-[#1F4E79]">
                    <Loader2 size={19} className="animate-spin" />
                    Loading eligible students...
                </div>
            ) : listError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
                    <AlertTriangle size={30} className="mx-auto mb-2 text-rose-500" />
                    <p className="text-sm font-semibold text-rose-800">{listError}</p>
                    <button
                        type="button"
                        onClick={loadStudents}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
                    >
                        <RefreshCw size={13} /> Retry
                    </button>
                </div>
            ) : (sheet?.students || []).length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                    <Users size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-700">No active students in this batch</p>
                    <p className="mt-1 text-xs text-gray-400">Check the selected class and batch in Student Management if this is unexpected.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-2 md:max-w-md">
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-center">
                            <p className="text-lg font-bold text-emerald-700">{counts.present}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Present</p>
                        </div>
                        <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-center">
                            <p className="text-lg font-bold text-rose-700">{counts.absent}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-600">Absent</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-center">
                            <p className="text-lg font-bold text-gray-600">{counts.unmarked}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Unmarked</p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="hidden grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 md:grid">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Student & guardian</span>
                            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Attendance</span>
                        </div>
                        <ul className="divide-y divide-gray-100">
                            {(sheet?.students || []).map((student) => {
                                const currentStatus = student.attendance?.status || "";
                                const isSaving = savingId === student.id;
                                const rowDisabled = Boolean(savingId);
                                const whatsappUrl = whatsappLinks[student.id];
                                return (
                                    <li key={student.id} className="p-4 transition-colors hover:bg-slate-50/60 md:px-5">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate text-sm font-bold text-gray-900">{student.name}</p>
                                                    <StatusBadge status={currentStatus} />
                                                    {whatsappUrl && (
                                                        <a
                                                            href={whatsappUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 rounded-full border border-[#1F4E79]/20 bg-[#1F4E79]/5 px-2.5 py-1 text-[11px] font-bold text-[#1F4E79] hover:bg-[#1F4E79]/10"
                                                            title="Reopen the prepared WhatsApp message"
                                                        >
                                                            <MessageCircle size={11} /> WhatsApp
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                                                    <span className="font-mono text-gray-400">ID: {student.student_id_card_no || "—"}</span>
                                                    <span>{batchCourseTitle(sheet?.batch) || "Class"} · {sheet?.batch?.name || "Batch"}</span>
                                                    {student.guardian_available ? (
                                                        <span className="inline-flex items-center gap-1 text-gray-600">
                                                            <MessageCircle size={11} />
                                                            {student.guardian_source_label || "Guardian"}: {student.guardian_masked}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                                                            <AlertTriangle size={11} /> No valid guardian number
                                                            {isAdmin && student.user_id && (
                                                                <Link
                                                                    to={`/admin/students/${student.user_id}/profile`}
                                                                    className="ml-1 underline decoration-amber-400 underline-offset-2 hover:text-amber-900"
                                                                >
                                                                    Update
                                                                </Link>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                <AttendanceButton
                                                    status="present"
                                                    active={currentStatus === "present"}
                                                    disabled={rowDisabled}
                                                    saving={isSaving && currentStatus !== "present"}
                                                    onClick={() => handleMark(student, "present")}
                                                />
                                                <AttendanceButton
                                                    status="absent"
                                                    active={currentStatus === "absent"}
                                                    disabled={rowDisabled}
                                                    saving={isSaving && currentStatus !== "absent"}
                                                    onClick={() => handleMark(student, "absent")}
                                                />
                                                {isSaving && <Loader2 size={16} className="animate-spin text-[#1F4E79]" aria-label="Saving" />}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
}
