import { useState } from "react";

export default function TagInput({ values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const add = (raw) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...values];
    parts.forEach((p) => {
      if (!next.includes(p)) next.push(p);
    });
    onChange(next);
    setDraft("");
  };

  const remove = (idx) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && values.length) {
      remove(values.length - 1);
    }
  };

  return (
    <div className="tag-input">
      {values.map((v, i) => (
        <span className="tag" key={`${v}-${i}`}>
          {v}
          <button type="button" onClick={() => remove(i)} aria-label={`Remove ${v}`}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => draft && add(draft)}
        placeholder={values.length ? "" : placeholder}
      />
    </div>
  );
}
