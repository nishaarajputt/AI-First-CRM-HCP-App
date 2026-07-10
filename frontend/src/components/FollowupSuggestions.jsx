import { useDispatch, useSelector } from "react-redux";
import { acceptFollowup, dismissFollowup } from "../store/interactionSlice";

export default function FollowupSuggestions() {
  const dispatch = useDispatch();
  const { followupSuggestions, dismissedFollowups } = useSelector(
    (s) => s.interaction
  );

  const visible = followupSuggestions.filter(
    (s) => !dismissedFollowups.includes(s.action)
  );

  if (visible.length === 0) return null;

  return (
    <div className="followup-panel">
      <div className="followup-title">📋 Suggested Follow-ups</div>
      {visible.map((s, i) => (
        <div key={i} className="followup-card">
          <div className="followup-action">{s.action}</div>
          {s.reason && <div className="followup-reason">{s.reason}</div>}
          {s.due_in_days != null && (
            <div className="followup-due">Due in {s.due_in_days} days</div>
          )}
          <div className="followup-actions">
            <button
              type="button"
              className="btn-followup accept"
              onClick={() => dispatch(acceptFollowup(s))}
            >
              Accept
            </button>
            <button
              type="button"
              className="btn-followup dismiss"
              onClick={() => dispatch(dismissFollowup(s.action))}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
