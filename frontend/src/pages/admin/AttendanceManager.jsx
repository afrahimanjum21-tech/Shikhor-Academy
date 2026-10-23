import { useState } from "react";
import { CalendarDays, ClipboardCheck, Table2 } from "lucide-react";
import ManualAttendancePanel from "../../components/attendance/ManualAttendancePanel";
import MonthlyAttendanceSheet from "./MonthlyAttendanceSheet";

export default function AttendanceManager() {
    const [view, setView] = useState("manual");

    const tabs = [
        { id: "manual", label: "Daily Manual & WhatsApp", icon: ClipboardCheck },
        { id: "monthly", label: "Monthly Sheet", icon: Table2 },
    ];

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-1 rounded-lg bg-gray-50 p-1" role="tablist" aria-label="Attendance views">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = view === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setView(tab.id)}
                                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-all sm:flex-none sm:px-4 sm:text-sm ${
                                    active
                                        ? "bg-[#1F4E79] text-white shadow-sm"
                                        : "text-gray-500 hover:bg-white hover:text-[#1F4E79]"
                                }`}
                            >
                                <Icon size={15} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
                <p className="hidden items-center gap-1.5 px-2 text-[11px] font-medium text-gray-400 md:flex">
                    <CalendarDays size={13} />
                    Manual attendance is active; biometric punches remain available as source records.
                </p>
            </div>

            {view === "manual" ? (
                <ManualAttendancePanel mode="admin" />
            ) : (
                <MonthlyAttendanceSheet />
            )}
        </div>
    );
}
