import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setField,
  resetForm,
  saveInteraction,
  clearHighlights,
  recalculateCompliance,
} from "../store/interactionSlice";
import ListAddField from "./ListAddField";
import VoiceNoteButton from "./VoiceNoteButton";
import ComplianceCoach from "./ComplianceCoach";

const INTERACTION_TYPES = [
  "Meeting",
  "Call",
  "Email",
  "Virtual",
  "Conference",
  "Other",
];

const SENTIMENTS = [
  { value: "Positive", emoji: "😊", label: "Positive" },
  { value: "Neutral", emoji: "😐", label: "Neutral" },
  { value: "Negative", emoji: "😞", label: "Negative" },
];

export default function LogInteractionForm() {
  const dispatch = useDispatch();
  const { form, saving, saveError, lastSavedId, highlightFields } = useSelector(
    (s) => s.interaction
  );

  useEffect(() => {
    if (highlightFields.length === 0) return;
    const t = setTimeout(() => dispatch(clearHighlights()), 1800);
    return () => clearTimeout(t);
  }, [highlightFields, dispatch]);

  const update = (field, value) => dispatch(setField({ field, value }));
  const hl = (field) => (highlightFields.includes(field) ? "field highlight" : "field");

  const onSubmit = (e) => {
    e.preventDefault();
    dispatch(saveInteraction(form));
  };

  return (
    <section className="panel form-panel">
      <div className="panel-header form-header">
        <h2>Log HCP Interaction</h2>
      </div>

      {lastSavedId && (
        <div className="banner success">
          Interaction saved successfully (ID #{lastSavedId}).
        </div>
      )}
      {saveError && <div className="banner error">{saveError}</div>}

      <ComplianceCoach />

      <form className="form-body" onSubmit={onSubmit}>
        <div className="grid-2">
          <div className={hl("hcp_name")}>
            <label htmlFor="hcp_name">HCP Name</label>
            <input
              id="hcp_name"
              value={form.hcp_name}
              onChange={(e) => update("hcp_name", e.target.value)}
              placeholder="Search or select HCP..."
            />
          </div>
          <div className={hl("interaction_type")}>
            <label htmlFor="interaction_type">Interaction Type</label>
            <select
              id="interaction_type"
              value={form.interaction_type}
              onChange={(e) => update("interaction_type", e.target.value)}
            >
              {INTERACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className={hl("interaction_date")}>
            <label htmlFor="interaction_date">Date</label>
            <input
              id="interaction_date"
              type="date"
              value={form.interaction_date || ""}
              onChange={(e) => update("interaction_date", e.target.value)}
            />
          </div>
          <div className={hl("interaction_time")}>
            <label htmlFor="interaction_time">Time</label>
            <input
              id="interaction_time"
              type="time"
              value={form.interaction_time || ""}
              onChange={(e) => update("interaction_time", e.target.value)}
            />
          </div>
        </div>

        <div className={hl("attendees")}>
          <label htmlFor="attendees">Attendees</label>
          <input
            id="attendees"
            value={(form.attendees || []).join(", ")}
            onChange={(e) =>
              update(
                "attendees",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="Enter names or search..."
          />
        </div>

        <div className={hl("topics_discussed")}>
          <label htmlFor="topics">Topics Discussed</label>
          <textarea
            id="topics"
            className="topics-area"
            value={form.topics_discussed || ""}
            onChange={(e) => update("topics_discussed", e.target.value)}
            placeholder="Enter key discussion points..."
          />
          <VoiceNoteButton
            initialText={form.topics_discussed || ""}
            onTranscript={(text) => update("topics_discussed", text)}
          />
        </div>

        <div className="section-title">Materials Shared / Samples Distributed</div>

        <div className={`materials-block ${hl("materials_shared")}`}>
          <label>Materials Shared</label>
          <ListAddField
            values={form.materials_shared}
            onChange={(v) => update("materials_shared", v)}
            emptyText="No materials added."
            searchLabel="🔍 Search/Add"
            placeholder="e.g. Brochures"
          />
        </div>

        <div className={`materials-block ${hl("samples_distributed")}`}>
          <label>Samples Distributed</label>
          <ListAddField
            values={form.samples_distributed}
            onChange={(v) => update("samples_distributed", v)}
            emptyText="No samples added."
            addLabel="+ Add Sample"
            placeholder="e.g. Prodo-X 50mg x5"
          />
        </div>

        <div className={hl("sentiment")}>
          <label>Observed/Inferred HCP Sentiment</label>
          <div className="sentiment-row">
            {SENTIMENTS.map(({ value, emoji, label }) => (
              <label
                key={value}
                className={`sentiment-option${form.sentiment === value ? " selected" : ""}`}
              >
                <input
                  type="radio"
                  name="sentiment"
                  value={value}
                  checked={form.sentiment === value}
                  onChange={() => update("sentiment", value)}
                />
                <span className="sentiment-emoji">{emoji}</span>
                <span className="sentiment-label">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={hl("outcome")}>
          <label htmlFor="outcome">Outcomes</label>
          <textarea
            id="outcome"
            value={form.outcome || ""}
            onChange={(e) => update("outcome", e.target.value)}
            placeholder="Key outcomes or agreements..."
          />
        </div>

        <div className={hl("follow_up_actions")}>
          <label htmlFor="followup">Follow-up Actions</label>
          <textarea
            id="followup"
            value={form.follow_up_actions || ""}
            onChange={(e) => update("follow_up_actions", e.target.value)}
            onBlur={() => dispatch(recalculateCompliance())}
            placeholder="Next steps, commitments, reminders..."
          />
        </div>
      </form>

      <div className="form-footer">
        <button type="button" className="btn btn-ghost" onClick={() => dispatch(resetForm())}>
          Clear
        </button>
        <button
          className="btn btn-primary"
          disabled={saving || !form.hcp_name.trim()}
          onClick={onSubmit}
        >
          {saving ? "Saving..." : "Log Interaction"}
        </button>
      </div>
    </section>
  );
}
