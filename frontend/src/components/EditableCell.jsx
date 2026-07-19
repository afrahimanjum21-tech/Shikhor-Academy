import { useState, useRef, useEffect, useCallback } from "react";

export default function EditableCell({
  value = "",
  onSave,
  onNavigate,
  className = "",
  placeholder = "",
  disabled = false,
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const inputRef = useRef(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (!editing) {
      setText(value);
      prevValue.current = value;
    }
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const save = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed !== prevValue.current) {
      setEditing(false);
      prevValue.current = trimmed;
      onSave(trimmed);
    } else {
      setEditing(false);
    }
  }, [text, onSave]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      save();
      if (onNavigate) onNavigate("down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      save();
      if (onNavigate) onNavigate(e.shiftKey ? "left" : "right");
    } else if (e.key === "Escape") {
      setText(prevValue.current);
      setEditing(false);
    } else if (e.key === "ArrowUp" && !e.shiftKey && !e.altKey) {
      if (onNavigate) { save(); onNavigate("up"); }
    } else if (e.key === "ArrowDown" && !e.shiftKey && !e.altKey) {
      if (onNavigate) { save(); onNavigate("down"); }
    }
  };

  if (!editing) {
    return (
      <div
        className={`min-h-[24px] px-1.5 py-1 cursor-pointer transition-all duration-150 hover:bg-[#1F4E79]/5 border border-transparent rounded group ${disabled ? 'cursor-default' : ''} ${className}`}
        onClick={() => { if (!disabled) setEditing(true); }}
        title="Click to edit"
      >
        {value ? (
          <div className="text-[9px] leading-relaxed whitespace-pre-wrap">
            {value.split('\n').map((line, i) => (
              <span key={i}>{i > 0 && <br />}{line}</span>
            ))}
          </div>
        ) : (
          <span className="text-gray-300 italic text-[8px]">{placeholder || 'Empty'}</span>
        )}
      </div>
    );
  }

  return (
    <textarea
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={save}
      onKeyDown={handleKeyDown}
      className={`w-full min-h-[24px] px-1.5 py-1 text-[9px] border-2 border-[#1F4E79] rounded outline-none resize-none bg-white shadow-sm ${className}`}
      rows={Math.max(2, (text.match(/\n/g) || []).length + 2)}
      disabled={disabled}
    />
  );
}
