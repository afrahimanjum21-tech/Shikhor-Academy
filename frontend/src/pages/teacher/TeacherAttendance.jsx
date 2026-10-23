import { CalendarDays } from "lucide-react";
import ManualAttendancePanel from "../../components/attendance/ManualAttendancePanel";

export default function TeacherAttendance() {
    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between md:px-5">
                <div>
                    <h1 className="flex items-center gap-2 text-lg font-bold text-[#1F4E79] md:text-xl">
                        <CalendarDays size={20} />
                        Attendance
                    </h1>
                    <p className="mt-0.5 text-xs text-gray-500 md:text-sm">
                        Mark your assigned batch, then review and send the prepared guardian message in WhatsApp.
                    </p>
                </div>
                <span className="inline-flex self-start rounded-full border border-[#1F4E79]/15 bg-[#1F4E79]/5 px-3 py-1 text-[11px] font-bold text-[#1F4E79] sm:self-auto">
                    Manual attendance only
                </span>
            </div>

            <ManualAttendancePanel mode="teacher" />
        </div>
    );
}
