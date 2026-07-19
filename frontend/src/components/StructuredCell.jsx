import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, ClipboardPaste, CopyPlus, Eraser, X } from "lucide-react";

/**
 * StructuredCell — an inline, spreadsheet-like editable timetable cell.
 *
 * One cell holds { subject, teacher, room, lab, notes }. Editing happens
 * entirely inside the cell (no modal / popover / form). On blur or Escape
 * the cell auto-saves. Arrow keys / Tab / Enter / Escape behave like a
 * spreadsheet and drive navigation through the parent grid via onNavigate.
 *
 * Copy / Paste / Duplicate / Clear are exposed through a small inline
 * toolbar (shown while editing) plus Ctrl+C / Ctrl+V / Ctrl+D / Delete.
 *
 * The cell value object can be serialised to the clipboard as JSON so a
 * whole structured entry (subject + teacher + room ...) can be pasted
 * between cells.
 */
const EMPTY = { subject: "", teacher: "", room: "", lab: "", notes: "" };

const fieldsEqual = (a, b) =>
  (a.subject || "") === (b.subject || "") &&
  (a.teacher || "") === (b.teacher || "") &&
  (a.room || "") === (b.room || "") &&
  (a.lab || "") === (b.lab || "") &&
  (a.notes || "") === (b.notes || "");

export default function StructuredCell({
  value,
  onSave,
  onNavigate,
  onCopy,
  onPaste,
  onDuplicate,
  onClear,
  className = "",
  disabled = false,
}) {
  const initial = { ...EMPTY, ...(value || {}) };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const committedRef = useRef(initial);
  const rootRef = useRef(null);
  const firstFieldRef = useRef(null);

  // Guard: when save() fires it sets editing=false on the same tick,
  // the sync effect below would run and overwrite committedRef with
  // the OLD value prop (parent hasn't re-rendered yet). This flag
  // suppresses that one cycle so our saved draft survives.
  const justSavedRef = useRef(false);

  // Keep local state in sync when the canonical value changes externally.
  useEffect(() => {
    if (!editing) {
      if (justSavedRef.current) {
        // We JUST saved — the parent still holds the old value prop.
        // Skip the overwrite so our committed draft survives until the
        // parent re-renders with the updated value.
        justSavedRef.current = false;
        return;
      }
      const next = { ...EMPTY, ...(value || {}) };
      if (!fieldsEqual(next, committedRef.current)) {
        committedRef.current = next;
        setDraft(next);
      }
    }
  }, [value, editing]);

  useEffect(() => {
    if (editing && firstFieldRef.current) {
      firstFieldRef.current.focus();
      firstFieldRef.current.select();
    }
  }, [editing]);

  const save = useCallback(() => {
    if (!fieldsEqual(draft, committedRef.current)) {
      committedRef.current = { ...draft };
      onSave?.({ ...draft });
      justSavedRef.current = true; // suppress the stale-value sync for one cycle
    }
    setEditing(false);
  }, [draft, onSave]);

  const cancel = useCallback(() => {
    setDraft(committedRef.current);
    setEditing(false);
  }, []);

  const setField = (key) => (e) =>
    setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  const isEmpty = !draft.subject && !draft.teacher && !draft.room && !draft.lab && !draft.notes;

  // --- Spreadsheet keyboard behaviour ---
  const handleKeyDown = (e) => {
    // Clipboard shortcuts while editing.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && !e.shiftKey) {
      e.preventDefault();
      onCopy?.({ ...draft });
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      e.preventDefault();
      onPaste?.();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      onDuplicate?.();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      save();
      onNavigate?.(e.shiftKey ? "left" : "right");
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
      onNavigate?.("down");
      return;
    }

    // Arrow keys navigate the grid when pressed at the field boundaries.
    const target = e.target;
    if (e.key === "ArrowUp") {
      const atTop = target.tagName === "TEXTAREA"
        ? target.selectionStart === 0 && target.selectionEnd === 0
        : true;
      if (atTop || e.altKey) {
        e.preventDefault();
        save();
        onNavigate?.("up");
      }
    } else if (e.key === "ArrowDown") {
      const len = target.value?.length || 0;
      const atBottom = target.tagName === "TEXTAREA"
        ? target.selectionStart === len && target.selectionEnd === len
        : true;
      if (atBottom || e.altKey) {
        e.preventDefault();
        save();
        onNavigate?.("down");
      }
    }
  };

  // --- Non-editing interactions ---
  const handleRootKeyDown = (e) => {
    if (editing || disabled) return;
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      setEditing(true);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onClear?.();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && !e.shiftKey) {
      e.preventDefault();
      onCopy?.({ ...committedRef.current });
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      e.preventDefault();
      onPaste?.();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      onDuplicate?.();
    } else if (e.key === "Tab") {
      e.preventDefault();
      onNavigate?.(e.shiftKey ? "left" : "right");
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
      onNavigate?.(map[e.key]);
    }
  };

  // Click outside the cell while editing should save.
  const handleBlur = (e) => {
    if (!rootRef.current) return;
    // Give focus to toolbar buttons without saving.
    if (rootRef.current.contains(e.relatedTarget)) return;
    save();
  };

  const actionBtn = (onClick, icon, label) => (
    <button
      type="button"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      className="p-px rounded text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors"
    >
      {icon}
    </button>
  );

  // --- Read-only display ---
  if (!editing) {
    return (
      <div
        ref={rootRef}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setEditing(true)}
        onKeyDown={handleRootKeyDown}
        className={`group relative w-full min-h-[24px] px-1 py-0.5 cursor-pointer rounded border border-transparent
          hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 outline-none
          focus:border-primary focus:bg-primary/5 ${className}`}
        title={disabled ? "" : "Click to edit · Tab/Arrows to move · Enter to open"}
      >
        {isEmpty ? (
          <span className="text-gray-300 italic text-[8px] select-none">+</span>
        ) : (
          <div className="leading-tight">
            {draft.subject && (
              <p className="text-[9px] font-bold text-text-main truncate leading-snug">
                {draft.subject}
              </p>
            )}
            {(draft.teacher || draft.room || draft.lab) && (
              <p className="text-[8px] text-text-muted truncate leading-snug">
                {[draft.teacher, draft.room, draft.lab].filter(Boolean).join(", ")}
              </p>
            )}
            {draft.notes && (
              <p className="text-[7px] text-gray-400 italic truncate leading-snug">{draft.notes}</p>
            )}
          </div>
        )}

        {/* hover toolbar */}
        {!disabled && (
          <div className="absolute top-0 right-0 flex items-center gap-px opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded-sm shadow-sm border border-gray-100 p-px">
            {actionBtn(() => onCopy?.({ ...committedRef.current }), <Copy size={8} />, "Copy")}
            {actionBtn(onPaste, <ClipboardPaste size={8} />, "Paste")}
            {actionBtn(onDuplicate, <CopyPlus size={8} />, "Duplicate")}
            {actionBtn(onClear, <Eraser size={8} />, "Clear")}
          </div>
        )}
      </div>
    );
  }

  // --- Inline editing mode ---
  const inputCls =
    "w-full text-[9px] px-1 py-0.5 rounded border border-gray-200 bg-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors";

  return (
    <div
      ref={rootRef}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="w-full p-1 rounded border-2 border-primary bg-white shadow-sm space-y-0.5"
    >
      <input
        ref={firstFieldRef}
        value={draft.subject}
        onChange={setField("subject")}
        placeholder="Subject"
        className={`${inputCls} font-bold`}
      />
      <div className="grid grid-cols-2 gap-0.5">
        <input value={draft.teacher} onChange={setField("teacher")} placeholder="Teacher" className={inputCls} />
        <input value={draft.room} onChange={setField("room")} placeholder="Room" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-0.5">
        <input value={draft.lab} onChange={setField("lab")} placeholder="Lab" className={inputCls} />
        <input value={draft.notes} onChange={setField("notes")} placeholder="Notes" className={inputCls} />
      </div>
      <div className="flex items-center justify-between pt-px">
        <div className="flex items-center gap-px">
          {actionBtn(() => onCopy?.({ ...draft }), <Copy size={9} />, "Copy")}
          {actionBtn(onPaste, <ClipboardPaste size={9} />, "Paste")}
          {actionBtn(onDuplicate, <CopyPlus size={9} />, "Duplicate")}
          {actionBtn(() => setDraft({ ...EMPTY }), <Eraser size={9} />, "Clear")}
        </div>
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={save}
          title="Save & close (Enter)"
          className="p-0.5 rounded text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <X size={9} />
        </button>
      </div>
    </div>
  );
}
