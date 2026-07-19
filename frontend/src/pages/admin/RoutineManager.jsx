import { useEffect, useState, useCallback, useRef } from "react";
import api from "../../services/api";
import StructuredCell from "../../components/StructuredCell";
import EditableCell from "../../components/EditableCell";
import {
  Save, Send, EyeOff, Download, Printer, Plus, Trash2,
  CalendarDays, ClipboardList, Grid3x3,
} from "lucide-react";
import { useConfirm } from "../../components/common/ConfirmDialog";
import logger from '../../services/logger';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const MORNING_SLOTS = [
  '7:00-7:45', '7:45-8:30', '8:30-9:15', '9:15-10:00',
  '10:00-10:45', '10:45-11:30', '11:30-12:15',
];

const AFTERNOON_SLOTS = [
  '3:00-3:45', '3:45-4:30', '4:30-5:15', '5:15-6:00', '6:00-6:45',
];

const SHIFTS = ['Morning', 'Afternoon'];

const EMPTY_CELL = { subject: '', teacher: '', room: '', lab: '', notes: '' };

function sortSlots(slots) {
  return [...slots].sort((a, b) => {
    const parse = (s) => {
      const m = (s || '').match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (!m) return 0;
      let h = parseInt(m[1], 10);
      const ap = (m[3] || '').toLowerCase();
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      return h * 60 + (parseInt(m[2] || '0', 10));
    };
    return parse(a) - parse(b);
  });
}

export default function RoutineManager() {
  const confirm = useConfirm();
  // selectors
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(() => localStorage.getItem('routine_course') || '');
  const [selectedBatch, setSelectedBatch] = useState(() => localStorage.getItem('routine_batch') || '');
  const [editingMode, setEditingMode] = useState(() => localStorage.getItem('routine_mode') || 'published');

  // academic meta filters
  const [metaOptions, setMetaOptions] = useState({});
  const [filters, setFilters] = useState({
    academic_year: '', session: '', department: '', program: '',
    semester: '', section: '', shift: '',
  });

  // per-shift timetable state
  const [routineMap, setRoutineMap] = useState({ Morning: {}, Afternoon: {} });
  const [timeSlotsMap, setTimeSlotsMap] = useState({ Morning: [...MORNING_SLOTS], Afternoon: [...AFTERNOON_SLOTS] });
  const [loadingMap, setLoadingMap] = useState({ Morning: false, Afternoon: false });
  const [savingMap, setSavingMap] = useState({ Morning: false, Afternoon: false });

  const [notesMorning, setNotesMorning] = useState('');
  const [notesAfternoon, setNotesAfternoon] = useState('');
  const [notesIdMorning, setNotesIdMorning] = useState(null);
  const [notesIdAfternoon, setNotesIdAfternoon] = useState(null);

  const [publishing, setPublishing] = useState(false);
  const [statusInfo, setStatusInfo] = useState({ hasDraft: false, hasPublished: false });
  const [message, setMessage] = useState(null);
  const [clipboard, setClipboard] = useState(null);

  const gridRefMorning = useRef(null);
  const gridRefAfternoon = useRef(null);
  const slotInputRef = useRef(null);
  const initialized = useRef(false);

  const routineMapRef = useRef(routineMap);
  routineMapRef.current = routineMap;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const selectedBatchRef = useRef(selectedBatch);
  selectedBatchRef.current = selectedBatch;
  const editingModeRef = useRef(editingMode);
  editingModeRef.current = editingMode;

  // ---------- data loading ----------
  useEffect(() => {
    api.get('/public/courses').then(res => setCourses(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      api.get('/admin/batches').then(res => {
        setBatches(res.data.filter(b => b.course_id == selectedCourse));
      }).catch(() => {});
    } else {
      setBatches([]);
    }
    if (!initialized.current) { initialized.current = true; return; }
    setSelectedBatch('');
    setRoutineMap({ Morning: {}, Afternoon: {} });
    setTimeSlotsMap({ Morning: [...MORNING_SLOTS], Afternoon: [...AFTERNOON_SLOTS] });
    setNotesMorning('');
    setNotesAfternoon('');
    setNotesIdMorning(null);
    setNotesIdAfternoon(null);
  }, [selectedCourse]);

  useEffect(() => { localStorage.setItem('routine_course', selectedCourse || ''); }, [selectedCourse]);
  useEffect(() => { localStorage.setItem('routine_batch', selectedBatch || ''); }, [selectedBatch]);
  useEffect(() => { localStorage.setItem('routine_mode', editingMode); }, [editingMode]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3200);
  };

  const loadMeta = useCallback(async (batchId) => {
    try {
      const { data } = await api.get('/admin/routines/meta', { params: { batch_id: batchId } });
      setMetaOptions(data);
    } catch { /* ignore */ }
  }, []);

  const loadRoutine = useCallback(async () => {
    if (!selectedBatch) return;
    setLoadingMap({ Morning: true, Afternoon: true });
    try {
      const [morningRes, afternoonRes] = await Promise.all([
        api.get('/admin/routines', { params: { batch_id: selectedBatch, shift: 'Morning', status: editingMode } }),
        api.get('/admin/routines', { params: { batch_id: selectedBatch, shift: 'Afternoon', status: editingMode } }),
      ]);

      const processShift = (data, defaultSlots) => {
        const days = data.days && !Array.isArray(data.days) ? data.days : {};
        const slots = new Set();
        Object.values(days).forEach(cells => cells.forEach(c => { if (c.time_slot) slots.add(c.time_slot); }));
        return { days, slots: slots.size > 0 ? sortSlots(Array.from(slots)) : [...defaultSlots] };
      };

      const morning = processShift(morningRes.data, MORNING_SLOTS);
      const afternoon = processShift(afternoonRes.data, AFTERNOON_SLOTS);

      setRoutineMap({ Morning: morning.days, Afternoon: afternoon.days });
      setTimeSlotsMap({ Morning: morning.slots, Afternoon: afternoon.slots });

      const sample = Object.values(morning.days).flat()[0] || Object.values(afternoon.days).flat()[0] || {};
      setFilters(prev => ({
        academic_year: prev.academic_year || sample.academic_year || new Date().getFullYear().toString(),
        session: prev.session || sample.session || '',
        department: prev.department || sample.department || '',
        program: prev.program || sample.program || '',
        semester: prev.semester || sample.semester || '',
        section: prev.section || sample.section || '',
        shift: '',
      }));

      setStatusInfo(morningRes.data.status || { hasDraft: false, hasPublished: false });
      await loadMeta(selectedBatch);
    } catch (err) {
      logger.error('Load routine error:', err);
      showMessage('Failed to load routine', 'error');
    } finally {
      setLoadingMap({ Morning: false, Afternoon: false });
    }
  }, [selectedBatch, editingMode, loadMeta]);

  useEffect(() => {
    if (selectedBatch) loadRoutine();
  }, [selectedBatch, editingMode, loadRoutine]);

  // ---------- per-shift cell helpers ----------
  const getCell = (shift, day, timeSlot) => {
    const cells = (routineMap[shift] || {})[day] || [];
    return cells.find(c => c.time_slot === timeSlot);
  };

  const upsertCell = (shift, day, timeSlot, cellData, id) => {
    setRoutineMap(prev => {
      const next = { ...prev };
      const days = { ...(next[shift] || {}) };
      const cells = [...(days[day] || [])];
      const idx = cells.findIndex(c => c.time_slot === timeSlot);
      const record = { id: id || cells[idx]?.id || null, day, time_slot: timeSlot, ...cellData };
      if (idx >= 0) cells[idx] = { ...cells[idx], ...record };
      else cells.push(record);
      days[day] = cells;
      next[shift] = days;
      return next;
    });
  };

  const removeCell = (shift, day, timeSlot) => {
    setRoutineMap(prev => {
      const next = { ...prev };
      const days = { ...(next[shift] || {}) };
      days[day] = (days[day] || []).filter(c => c.time_slot !== timeSlot);
      next[shift] = days;
      return next;
    });
  };

  const ensureSlot = (shift, slot) => {
    setTimeSlotsMap(prev => {
      const slots = prev[shift] || [];
      return { ...prev, [shift]: slots.includes(slot) ? slots : sortSlots([...slots, slot]) };
    });
  };

  // ---------- cell save ----------
  const handleSaveCell = useCallback(async (shift, day, timeSlot, content) => {
    const currentMap = routineMapRef.current;
    const shiftRoutine = currentMap[shift] || {};
    const existing = (shiftRoutine[day] || []).find(c => c.time_slot === timeSlot);
    const batchId = selectedBatchRef.current;
    const currentFilters = filtersRef.current;

    const hasContent = content.subject || content.teacher || content.room || content.lab || content.notes;

    if (hasContent) {
      upsertCell(shift, day, timeSlot, content, existing?.id);
      ensureSlot(shift, timeSlot);
      setStatusInfo(prev => ({ ...prev, hasDraft: true }));
    } else if (existing?.id) {
      removeCell(shift, day, timeSlot);
    } else {
      return;
    }

    try {
      if (existing?.id) {
        if (hasContent) {
          const { data } = await api.put(`/admin/routines/${existing.id}`, content);
          upsertCell(shift, day, timeSlot, data, data.id);
        } else {
          await api.delete(`/admin/routines/${existing.id}`);
        }
      } else {
        const { data } = await api.post('/admin/routines', {
          batch_id: Number(batchId),
          day, time_slot: timeSlot, status: editingModeRef.current, ...content, ...currentFilters, shift,
        });
        upsertCell(shift, day, timeSlot, data, data.id);
      }
    } catch (err) {
      logger.error('Save cell error:', err);
      showMessage('Failed to save cell', 'error');
      if (existing?.id) {
        upsertCell(shift, day, timeSlot, {
          subject: existing.subject, teacher: existing.teacher,
          room: existing.room, lab: existing.lab, notes: existing.notes,
        }, existing.id);
      }
    }
  }, []);

  // ---------- copy / paste / duplicate / clear ----------
  const handleCopy = (content) => setClipboard(content);

  const handlePaste = (shift, day, timeSlot) => {
    if (!clipboard) {
      showMessage('Nothing to paste — copy a cell first (Ctrl+C)', 'error');
      return;
    }
    handleSaveCell(shift, day, timeSlot, { ...EMPTY_CELL, ...clipboard });
  };

  const handleDuplicate = (shift, day, timeSlot) => {
    const cell = getCell(shift, day, timeSlot);
    if (!cell) {
      showMessage('Nothing to duplicate', 'error');
      return;
    }
    setClipboard({ subject: cell.subject, teacher: cell.teacher, room: cell.room, lab: cell.lab, notes: cell.notes });
    showMessage('Cell copied — pick another cell and press Paste (Ctrl+V)');
  };

  const handleClear = (shift, day, timeSlot) => {
    handleSaveCell(shift, day, timeSlot, { ...EMPTY_CELL });
  };

  // ---------- time slot editing ----------
  const [editingSlot, setEditingSlot] = useState(null);
  const [editSlotValue, setEditSlotValue] = useState('');

  const handleStartEditSlot = (slot) => { setEditingSlot(slot); setEditSlotValue(slot); };

  const handleFinishEditSlot = async (shift, oldSlot) => {
    const newSlot = editSlotValue.trim();
    setEditingSlot(null);
    if (!newSlot || newSlot === oldSlot) return;
    try {
      await api.post('/admin/routines/rename-time-slot', {
        batch_id: Number(selectedBatch), old_slot: oldSlot, new_slot: newSlot,
      });
      setTimeSlotsMap(prev => ({
        ...prev,
        [shift]: sortSlots(prev[shift].map(s => s === oldSlot ? newSlot : s)),
      }));
      setRoutineMap(prev => {
        const next = { ...prev };
        const days = { ...(next[shift] || {}) };
        Object.entries(days).forEach(([day, cells]) => {
          days[day] = cells.map(c => c.time_slot === oldSlot ? { ...c, time_slot: newSlot } : c);
        });
        next[shift] = days;
        return next;
      });
    } catch (err) {
      logger.error('Rename slot error:', err);
      showMessage('Failed to rename time slot', 'error');
    }
  };

  const handleSlotKeyDown = (e, shift, oldSlot) => {
    if (e.key === 'Enter') { e.preventDefault(); handleFinishEditSlot(shift, oldSlot); }
    else if (e.key === 'Escape') { setEditingSlot(null); setEditSlotValue(oldSlot); }
  };

  // ---------- per-shift draft / publish ----------
  const handleSaveDraft = async (shift) => {
    if (!selectedBatch) return;
    setSavingMap(prev => ({ ...prev, [shift]: true }));
    try {
      const slots = timeSlotsMap[shift] || [];
      const cells = [];
      slots.forEach(slot => {
        DAYS.forEach(day => {
          const cell = getCell(shift, day, slot);
          cells.push({
            day, time_slot: slot, shift,
            subject: cell?.subject || '', teacher: cell?.teacher || '',
            room: cell?.room || '', lab: cell?.lab || '', notes: cell?.notes || '',
          });
        });
      });
      const { data } = await api.post('/admin/routines/save-all', {
        batch_id: Number(selectedBatch), cells, status: editingMode, ...filters, shift,
      });
      const days = data.days && !Array.isArray(data.days) ? data.days : {};
      setRoutineMap(prev => ({ ...prev, [shift]: days }));
      setStatusInfo(data.status || statusInfo);
      showMessage(`${shift} ${editingMode === 'published' ? 'saved (live)' : 'draft saved'}!`);
    } catch (err) {
      logger.error('Save draft error:', err);
      showMessage('Failed to save draft', 'error');
    } finally {
      setSavingMap(prev => ({ ...prev, [shift]: false }));
    }
  };

  const handleSaveBoth = async () => {
    await handleSaveDraft('Morning');
    await handleSaveDraft('Afternoon');
  };

  const handlePublish = async () => {
    if (!selectedBatch) return;
    const ok1 = await confirm({ title: "Publish Routine?", message: "Publish both shifts? Students will see them immediately.", confirmText: "Publish", cancelText: "Cancel", variant: "destructive" }); if (!ok1) return;
    setPublishing(true);
    try {
      const { data } = await api.post('/admin/routines/publish', { batch_id: Number(selectedBatch) });
      setStatusInfo(data.status || { hasDraft: true, hasPublished: true });
      showMessage('Routine published successfully!');
    } catch (err) {
      logger.error('Publish error:', err);
      showMessage('Failed to publish', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!selectedBatch) return;
    const ok2 = await confirm({ title: "Unpublish Routine?", message: "Unpublish this routine? Students will no longer see it.", confirmText: "Unpublish", cancelText: "Cancel", variant: "destructive" }); if (!ok2) return;
    try {
      const { data } = await api.post('/admin/routines/unpublish', { batch_id: Number(selectedBatch) });
      setStatusInfo(data.status || { hasDraft: true, hasPublished: false });
      showMessage('Routine unpublished.');
    } catch (err) {
      logger.error('Unpublish error:', err);
      showMessage('Failed to unpublish', 'error');
    }
  };

  const handlePrint = () => window.print();

  const filterField = (key, label) => (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
      <input
        list={`opts-${key}`}
        value={filters[key]}
        onChange={e => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder="—"
        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-shadow"
      />
      <datalist id={`opts-${key}`}>
        {(metaOptions[key] || []).map(v => <option key={v} value={v} />)}
      </datalist>
    </div>
  );

  const renderTable = (shift) => {
    const slots = timeSlotsMap[shift] || [];
    const loading = loadingMap[shift];
    const saving = savingMap[shift];
    const gridRef = shift === 'Morning' ? gridRefMorning : gridRefAfternoon;
    const notes = shift === 'Morning' ? notesMorning : notesAfternoon;
    const setNotes = shift === 'Morning' ? setNotesMorning : setNotesAfternoon;

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        {/* Shift header */}
        <div className="flex items-center px-3 md:px-5 py-2 md:py-3 bg-gray-50 border-b border-gray-200 rounded-t-2xl">
          <h2 className="text-sm md:text-base font-bold text-primary">{shift}</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto custom-scrollbar">
              <div className="p-2" ref={gridRef}>
                <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 bg-primary-light border border-gray-200 px-1 py-1.5 text-left text-[9px] font-bold text-primary uppercase tracking-wide w-[14%]">
                        Time
                      </th>
                      {DAYS.map(day => (
                        <th key={day} className="bg-primary text-white border border-primary px-1 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide">
                          {day.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot, si) => (
                      <tr key={slot} className={si % 2 === 1 ? 'bg-primary-light/40' : ''}>
                        <td className="sticky left-0 z-10 bg-inherit border border-gray-200 px-1 py-1.5 text-[9px] font-bold text-text-main">
                          <div className="flex items-center justify-between gap-1">
                            {editingSlot === slot ? (
                              <input
                                ref={slotInputRef}
                                value={editSlotValue}
                                onChange={e => setEditSlotValue(e.target.value)}
                                onBlur={() => handleFinishEditSlot(shift, slot)}
                                onKeyDown={e => handleSlotKeyDown(e, shift, slot)}
                                className="w-full text-[9px] font-bold text-text-main bg-white border border-primary rounded px-1 py-0.5 outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => handleStartEditSlot(slot)}
                                className="text-[9px] font-bold text-text-main cursor-pointer hover:text-primary hover:bg-white/50 rounded px-1 py-0.5 w-full transition-colors"
                                title="Click to rename"
                              >
                                {slot}
                              </span>
                            )}
                          </div>
                        </td>
                        {DAYS.map((day, di) => {
                          const cell = getCell(shift, day, slot);
                          return (
                            <td key={`${day}||${slot}`} data-cell={`${day}||${slot}`}
                              className="border border-gray-200 p-0 align-top bg-white">
                              <StructuredCell
                                value={cell ? {
                                  subject: cell.subject, teacher: cell.teacher,
                                  room: cell.room, lab: cell.lab, notes: cell.notes,
                                } : EMPTY_CELL}
                                onSave={(content) => handleSaveCell(shift, day, slot, content)}
                                onCopy={handleCopy}
                                onPaste={() => handlePaste(shift, day, slot)}
                                onDuplicate={() => handleDuplicate(shift, day, slot)}
                                onClear={() => handleClear(shift, day, slot)}
                                onNavigate={(dir) => {
                                  const ti = slots.indexOf(slot);
                                  let nti = ti, ndi = di;
                                  if (dir === 'up') nti = Math.max(0, ti - 1);
                                  else if (dir === 'down') nti = Math.min(slots.length - 1, ti + 1);
                                  else if (dir === 'left') ndi = Math.max(0, di - 1);
                                  else if (dir === 'right') ndi = Math.min(DAYS.length - 1, di + 1);
                                  const td = gridRef.current?.querySelector(
                                    `[data-cell="${DAYS[ndi]}||${slots[nti]}"]`
                                  );
                                  td?.querySelector('[tabindex="0"]')?.focus();
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-gray-200 p-3 bg-primary-light/50">
              <p className="text-[9px] font-bold text-primary uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <ClipboardList size={11} /> Notes
              </p>
              <div className="bg-white rounded border border-gray-200 p-2 text-text-main">
                <EditableCell
                  value={notes}
                  onSave={setNotes}
                  placeholder={`General notes for ${shift}...`}
                />
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 routine-manager" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 no-print">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-primary flex items-center gap-2">
            <Grid3x3 size={22} className="md:size-6" /> Class Routine
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-0.5 hidden sm:block">
            Click any cell to edit · Tab/Arrows to navigate · Enter to open · Ctrl+C/V/D to copy/paste/duplicate
          </p>
        </div>
        {selectedBatch && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto overflow-x-auto scrollbar-hide pb-1">
            {editingMode === 'published' ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
                Published
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
                Draft
              </span>
            )}
            <button onClick={() => setEditingMode(m => m === 'published' ? 'draft' : 'published')}
              className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 text-gray-600 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-gray-100 transition-colors whitespace-nowrap">
              {editingMode === 'published' ? 'Draft' : 'Published'}
            </button>
            <button onClick={handleSaveBoth}
              className="px-2.5 sm:px-4 py-1 sm:py-1.5 bg-primary text-white rounded-lg text-[10px] sm:text-xs font-bold hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-1 whitespace-nowrap">
              <Save size={12} /> Save
            </button>
            {editingMode === 'draft' && (
              <>
                <button onClick={handlePublish} disabled={publishing}
                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-green-600 text-white rounded-lg text-[10px] sm:text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm flex items-center gap-1 whitespace-nowrap">
                  <Send size={12} /> {publishing ? '...' : 'Publish'}
                </button>
                {statusInfo.hasPublished && (
                  <button onClick={handleUnpublish}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-500 text-white rounded-lg text-[10px] sm:text-xs font-bold hover:bg-amber-600 transition-colors shadow-sm whitespace-nowrap">
                    <EyeOff size={12} className="inline" /> Unpublish
                  </button>
                )}
              </>
            )}
            {statusInfo.hasPublished && editingMode === 'published' && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
              </span>
            )}
            <button onClick={handlePrint}
              className="px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-200 text-gray-600 rounded-lg text-[10px] sm:text-xs hover:bg-primary-light transition-colors whitespace-nowrap">
              <Download size={12} className="inline" /> PDF
            </button>
          </div>
        )}
      </div>

      {/* Toast */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-semibold shadow-sm no-print ${
          message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Selectors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 no-print">
        <div>
          <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Program / Course</label>
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-shadow">
            <option value="">— Select Course —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Batch / Section</label>
          <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} disabled={!selectedCourse}
            className="w-full border border-gray-200 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none disabled:bg-gray-100 transition-shadow">
            <option value="">— Select Batch —</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Academic filters */}
      {selectedBatch && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 md:p-5 no-print">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 md:mb-3 flex items-center gap-1.5">
            <ClipboardList size={12} className="md:size-3" /> Academic Context
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {filterField('academic_year', 'Academic Year')}
            {filterField('session', 'Session')}
            {filterField('department', 'Department')}
            {filterField('program', 'Program')}
            {filterField('semester', 'Semester')}
            {filterField('section', 'Section')}
          </div>
        </div>
      )}

      {/* Two tables */}
      {selectedBatch && (
        <div className="space-y-6">
          {renderTable('Morning')}
          {renderTable('Afternoon')}
        </div>
      )}

      {!selectedBatch && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-16 text-center no-print">
          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-2xl bg-primary-light flex items-center justify-center">
            <CalendarDays size={24} className="md:size-8 text-primary" />
          </div>
          <h3 className="text-base md:text-lg font-bold text-text-main mb-1 md:mb-2">Select a Course & Batch</h3>
          <p className="text-xs md:text-sm text-text-muted max-w-md mx-auto">
            Choose a course and batch above to build the weekly class routine.
            Click any cell to edit, use Tab and arrows to move around.
          </p>
        </div>
      )}

      {/* Print / PDF styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .routine-manager { padding: 0 !important; }
          .routine-manager .bg-white {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          .routine-manager table {
            page-break-inside: auto;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
          }
          .routine-manager th {
            background: #1F4E79 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .routine-manager td, .routine-manager th {
            border: 1px solid #ccc !important;
          }
          .routine-manager tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
