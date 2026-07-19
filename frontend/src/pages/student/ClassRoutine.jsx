import { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNotificationCounts } from "../../context/NotificationContext";
import {
  CalendarDays, AlertCircle, Printer,
} from "lucide-react";
import logger from '../../services/logger';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEFAULT_SLOTS = [
  '8:00-8:45', '8:45-9:30', '9:30-10:15', '10:15-11:00',
  '11:00-11:45', '11:45-12:30', '12:30-1:15', '1:15-2:00',
];

function sortSlots(slots) {
  const parse = (s) => {
    const m = (s || '').match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!m) return 0;
    let h = parseInt(m[1], 10);
    const ap = (m[3] || '').toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return h * 60 + (parseInt(m[2] || '0', 10));
  };
  return [...slots].sort((a, b) => parse(a) - parse(b));
}

export default function ClassRoutine() {
  const { user } = useAuth();
  const { markViewed } = useNotificationCounts();
  const [shifts, setShifts] = useState({});
  const [shiftTimeSlots, setShiftTimeSlots] = useState({});
  const [label, setLabel] = useState('');
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { markViewed('routine'); }, [markViewed]);

  useEffect(() => {
    api.get('/student/routine')
      .then(res => {
        const data = res.data || {};
        const s = data.shifts || {};
        setShifts(s);
        setLabel(data.label || '');
        setMeta(data.meta || {});
        const slotsMap = {};
        Object.entries(s).forEach(([shift, days]) => {
          const slots = new Set();
          Object.values(days).forEach(cells => cells.forEach(c => { if (c.time_slot) slots.add(c.time_slot); }));
          slotsMap[shift] = slots.size > 0 ? sortSlots(Array.from(slots)) : [...DEFAULT_SLOTS];
        });
        setShiftTimeSlots(slotsMap);
      })
      .catch(err => logger.error('Routine load error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-text-muted">Loading your routine...</p>
      </div>
    </div>
  );

  const totalClasses = Object.values(shifts).reduce((sum, days) =>
    sum + Object.values(days).reduce((s, c) => s + c.length, 0), 0);
  const daysWithClasses = DAYS.filter(d =>
    Object.values(shifts).some(days => (days[d]?.length || 0) > 0)
  ).length;
  const shiftNames = Object.keys(shifts);
  const metaChips = Object.entries({
    Department: meta.department, Program: meta.program, Semester: meta.semester,
    Section: meta.section, 'Academic Year': meta.academic_year, Session: meta.session,
  }).filter(([, v]) => v);

  if (totalClasses === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
            <CalendarDays size={44} className="text-primary/60" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
            <AlertCircle size={20} className="text-gray-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-text-main">No Published Routine</h2>
        <p className="text-text-muted mt-2 max-w-sm">
          No published class routine is available{label ? <> for <span className="font-semibold">{label}</span></> : null} yet.
          Please check back later.
        </p>
      </div>
    );
  }

  const renderTable = (shift, days, timeSlots) => {
    const getCell = (day, timeSlot) =>
      (days[day] || []).find(c => c.time_slot === timeSlot);

    return (
      <div key={shift} className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-bold text-primary">{shift}</h2>
        </div>

        <div className="overflow-x-auto custom-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th className="bg-primary text-white px-1 py-1.5 text-left text-[9px] font-bold uppercase tracking-wide w-[14%]">
                  Time
                </th>
                {DAYS.map(day => (
                  <th key={day} className="bg-primary text-white px-1 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide">
                    {day.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, si) => (
                <tr key={slot} className={si % 2 === 1 ? 'bg-primary-light/40' : ''}>
                  <td className="border border-gray-200 px-1 py-1.5 text-[9px] font-bold text-text-main">
                    {slot}
                  </td>
                  {DAYS.map(day => {
                    const cell = getCell(day, slot);
                    const hasData = cell && (cell.subject || cell.teacher || cell.room || cell.lab);
                    return (
                      <td key={`${day}||${slot}`} className="border border-gray-200 px-1 py-1.5">
                        {hasData ? (
                          <div className="leading-tight">
                            {cell.subject && (
                              <p className="text-[9px] font-bold text-text-main truncate">{cell.subject}</p>
                            )}
                            <p className="text-[8px] text-text-muted truncate">
                              {cell.teacher}{cell.teacher && (cell.room || cell.lab) ? ", " : ""}{cell.room || cell.lab || ""}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-[9px]">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 class-routine-view" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 no-print">
        <div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <CalendarDays size={22} /> My Class Routine
          </h1>
          <p className="text-xs text-text-muted mt-1">
            {totalClasses} classes across {daysWithClasses} days
            {label ? <> — <span className="font-semibold text-text-main">{label}</span></> : null}
          </p>
          {metaChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {metaChips.map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-light text-primary rounded-full text-[10px] font-semibold">
                  <span className="opacity-60">{k}:</span> {v}
                </span>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-primary-light transition-colors">
          <Printer size={14} /> Print
        </button>
      </div>

      <div className="space-y-4">
        {shiftNames.map(shift =>
          renderTable(shift, shifts[shift] || {}, shiftTimeSlots[shift] || [])
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .class-routine-view .bg-white {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          .class-routine-view table {
            page-break-inside: auto;
            border-collapse: collapse !important;
          }
          .class-routine-view th {
            background: #1F4E79 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .class-routine-view td, .class-routine-view th {
            border: 1px solid #ccc !important;
          }
          .class-routine-view tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
