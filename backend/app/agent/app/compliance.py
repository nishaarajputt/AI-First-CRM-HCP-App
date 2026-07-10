"""Rule-based compliance scoring for HCP interaction logs."""

from typing import Any

# (field_key, label, required, weight)
COMPLIANCE_RULES: list[tuple[str, str, bool, int]] = [
    ("hcp_name", "HCP Name", True, 20),
    ("interaction_date", "Interaction Date", True, 15),
    ("topics_discussed", "Topics Discussed", True, 20),
    ("sentiment", "HCP Sentiment", False, 10),
    ("outcome", "Outcomes", False, 10),
    ("follow_up_actions", "Follow-up Actions", False, 15),
    ("materials_shared", "Materials Shared", False, 5),
    ("samples_distributed", "Samples Documented", False, 5),
]


def _is_filled(data: dict[str, Any], field: str) -> bool:
    value = data.get(field)
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return len(value) > 0
    return bool(value)


def score_compliance(data: dict[str, Any]) -> dict[str, Any]:
    """Return completeness score, checklist, missing fields, and rule-based warnings."""
    checklist = []
    missing_required: list[str] = []
    earned = 0
    total = sum(w for _, _, _, w in COMPLIANCE_RULES)

    for field, label, required, weight in COMPLIANCE_RULES:
        complete = _is_filled(data, field)
        if complete:
            earned += weight
        elif required:
            missing_required.append(label)
        checklist.append(
            {
                "field": field,
                "label": label,
                "complete": complete,
                "required": required,
            }
        )

    warnings: list[str] = []
    samples = data.get("samples_distributed") or []
    if samples:
        for s in samples:
            if isinstance(s, str) and not any(c.isdigit() for c in s):
                warnings.append(
                    "Sample entries should include quantity (e.g. 'Prodo-X 50mg x5') for compliance."
                )
                break

    topics = (data.get("topics_discussed") or "").lower()
    if "sample" in topics and not samples:
        warnings.append("Topics mention samples but none are documented in Samples Distributed.")

    if _is_filled(data, "materials_shared") and not _is_filled(data, "follow_up_actions"):
        warnings.append("Materials were shared — consider documenting a follow-up action.")

    score = round((earned / total) * 100) if total else 0
    ready = not missing_required and score >= 70

    return {
        "completeness_score": score,
        "missing_fields": missing_required,
        "compliance_warnings": warnings,
        "checklist": checklist,
        "ready_to_save": ready,
    }
