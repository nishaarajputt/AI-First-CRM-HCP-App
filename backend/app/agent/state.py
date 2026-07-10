from typing import Any, Optional, TypedDict


class AgentState(TypedDict, total=False):
    """State passed between LangGraph nodes."""

    message: str
    history: list[dict[str, str]]
    current_form: dict[str, Any]

    intent: str
    extracted: dict[str, Any]
    updated_fields: list[str]
    reply: str
    ready_to_save: bool

    completeness_score: int
    missing_fields: list[str]
    compliance_warnings: list[str]
    checklist: list[dict[str, Any]]
    followup_suggestions: list[dict[str, Any]]

    error: Optional[str]
