import { useSelector } from "react-redux";

export default function ComplianceCoach() {
  const { completenessScore, checklist, complianceWarnings, missingFields } =
    useSelector((s) => s.interaction);

  if (!checklist.length && completenessScore === 0) return null;

  const scoreColor =
    completenessScore >= 80 ? "good" : completenessScore >= 50 ? "warn" : "bad";

  return (
    <div className="compliance-coach">
      <div className="compliance-header">
        <span className="compliance-title">Compliance Coach</span>
        <span className={`compliance-score ${scoreColor}`}>{completenessScore}%</span>
      </div>
      <div className="compliance-bar">
        <div
          className={`compliance-bar-fill ${scoreColor}`}
          style={{ width: `${completenessScore}%` }}
        />
      </div>
      <ul className="compliance-checklist">
        {checklist.map((item) => (
          <li key={item.field} className={item.complete ? "done" : "pending"}>
            <span className="check-icon">{item.complete ? "✓" : "○"}</span>
            <span>
              {item.label}
              {item.required && !item.complete && (
                <span className="required-tag"> required</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {missingFields.length > 0 && (
        <p className="compliance-missing">
          Missing: {missingFields.join(", ")}
        </p>
      )}
      {complianceWarnings.map((w, i) => (
        <p key={i} className="compliance-warning">
          ⚠ {w}
        </p>
      ))}
    </div>
  );
}
