import { useState } from "react";

export default function ListAddField({
  values,
  onChange,
  emptyText,
  addLabel,
  searchLabel = "🔍 Search/Add",
  placeholder,
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);

  const add = () => {
    const item = draft.trim();
    if (!item) return;
    if (!values.includes(item)) onChange([...values, item]);
    setDraft("");
    setOpen(false);
  };

  const remove = (idx) => onChange(values.filter((_, i) => i !== idx));

  return (
    <div className="list-add-field">
      <div className="list-add-display">
        {values.length === 0 ? (
          <span className="list-empty">{emptyText}</span>
        ) : (
          <ul className="list-items">
            {values.map((v, i) => (
              <li key={`${v}-${i}`}>
                {v}.
                <button type="button" className="list-remove" onClick={() => remove(i)} aria-label={`Remove ${v}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {open ? (
        <div className="list-add-input-row">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            placeholder={placeholder}
            autoFocus
          />
          <button type="button" className="btn-inline" onClick={add}>
            Add
          </button>
          <button type="button" className="btn-inline ghost" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className="btn-add" onClick={() => setOpen(true)}>
          {addLabel || searchLabel}
        </button>
      )}
    </div>
  );
}
