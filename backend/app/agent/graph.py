"""LangGraph agent for the Log Interaction screen.

Graph:

    START -> router
      -> log_interaction  -> extract  -> compliance -> followup -> confirm -> END
      -> refine_interaction -> refine  -> compliance -> followup -> confirm -> END
      -> chat             -> chat     -> END
"""

import json
import re
from datetime import date, timedelta
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from app.agent import prompts
from app.agent.compliance import score_compliance
from app.agent.llm import get_llm
from app.agent.state import AgentState

VALID_TYPES = {"Meeting", "Call", "Email", "Virtual", "Conference", "Other"}
VALID_SENTIMENT = {"Positive", "Neutral", "Negative"}
VALID_INTENTS = {"log_interaction", "refine_interaction", "chat"}

EMPTY_EXTRACTION: dict[str, Any] = {
    "hcp_name": "",
    "interaction_type": "Meeting",
    "interaction_date": None,
    "interaction_time": None,
    "attendees": [],
    "topics_discussed": None,
    "materials_shared": [],
    "samples_distributed": [],
    "sentiment": None,
    "follow_up_actions": None,
    "outcome": None,
}


def _parse_json(raw: str) -> dict[str, Any]:
    if not raw:
        return {}
    cleaned = re.sub(r"```(?:json)?", "", raw).strip("` \n")
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    candidate = match.group(0) if match else cleaned
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return {}


def _parse_json_array(raw: str) -> list[dict[str, Any]]:
    if not raw:
        return []
    cleaned = re.sub(r"```(?:json)?", "", raw).strip("` \n")
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    candidate = match.group(0) if match else cleaned
    try:
        data = json.loads(candidate)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def _history_messages(history: list[dict[str, str]]) -> list:
    msgs = []
    for turn in history[-8:]:
        role = turn.get("role")
        content = turn.get("content", "")
        if role == "user":
            msgs.append(HumanMessage(content=content))
        elif role == "assistant":
            msgs.append(AIMessage(content=content))
    return msgs


def _infer_date_from_message(message: str) -> str | None:
    msg = message.lower()
    today = date.today()
    if re.search(r"\b(today|this morning|this afternoon|this evening|tonight)\b", msg):
        return today.isoformat()
    if re.search(r"\byesterday\b", msg):
        return (today - timedelta(days=1)).isoformat()
    return None


def _infer_outcome(merged: dict[str, Any]) -> dict[str, Any]:
    if merged.get("outcome"):
        return merged
    parts: list[str] = []
    sentiment = merged.get("sentiment")
    topics = merged.get("topics_discussed")
    materials = merged.get("materials_shared") or []
    samples = merged.get("samples_distributed") or []
    if sentiment and topics:
        parts.append(f"{sentiment} discussion on {topics}")
    elif sentiment:
        parts.append(f"{sentiment} interaction overall")
    elif topics:
        parts.append(f"Discussed {topics}")
    if materials:
        parts.append(f"shared {', '.join(materials)}")
    if samples:
        parts.append(f"left samples: {', '.join(samples)}")
    if parts:
        merged["outcome"] = ". ".join(parts).capitalize() + "."
    return merged


def _apply_relative_dates(merged: dict[str, Any], message: str) -> dict[str, Any]:
    if not merged.get("interaction_date"):
        inferred = _infer_date_from_message(message)
        if inferred:
            merged["interaction_date"] = inferred
    return merged


def _normalize(extracted: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
    merged = {**EMPTY_EXTRACTION, **(current or {})}
    for key in EMPTY_EXTRACTION:
        if key in extracted and extracted[key] not in (None, "", []):
            merged[key] = extracted[key]
    if merged.get("interaction_type") not in VALID_TYPES:
        merged["interaction_type"] = "Meeting"
    if merged.get("sentiment") not in VALID_SENTIMENT:
        merged["sentiment"] = None
    for list_key in ("attendees", "materials_shared", "samples_distributed"):
        value = merged.get(list_key)
        if isinstance(value, str):
            merged[list_key] = [value] if value else []
        elif not isinstance(value, list):
            merged[list_key] = []
    return merged


def _diff_fields(before: dict[str, Any], after: dict[str, Any]) -> list[str]:
    changed = []
    for key in EMPTY_EXTRACTION:
        if before.get(key) != after.get(key):
            changed.append(key)
    return changed


# --------------------------------------------------------------------------- #
# Nodes
# --------------------------------------------------------------------------- #
def router_node(state: AgentState) -> AgentState:
    llm = get_llm(temperature=0.0)
    current = state.get("current_form") or {}
    has_form_data = bool(current.get("hcp_name") or current.get("topics_discussed"))
    context = (
        f"FORM_HAS_DATA: {has_form_data}\n"
        f"CURRENT_FORM:\n{json.dumps(current, default=str)}\n\n"
        f"USER_MESSAGE:\n{state['message']}"
    )
    messages = [
        SystemMessage(content=prompts.ROUTER_SYSTEM),
        HumanMessage(content=context),
    ]
    try:
        resp = llm.invoke(messages)
        data = _parse_json(resp.content)
        intent = data.get("intent", "chat")
    except Exception as exc:
        return {"intent": "chat", "error": str(exc)}
    if intent not in VALID_INTENTS:
        intent = "chat"
    return {"intent": intent}


def extract_node(state: AgentState) -> AgentState:
    llm = get_llm(temperature=0.0)
    current = state.get("current_form") or {}
    today = date.today().isoformat()
    context = (
        f"TODAY_DATE: {today}\n\n"
        f"CURRENT_FORM:\n{json.dumps(current, default=str)}\n\n"
        f"REP_NOTE:\n{state['message']}"
    )
    messages = [
        SystemMessage(content=prompts.EXTRACT_SYSTEM),
        *_history_messages(state.get("history", [])),
        HumanMessage(content=context),
    ]
    try:
        resp = llm.invoke(messages)
        parsed = _parse_json(resp.content)
    except Exception as exc:
        return {"extracted": current or EMPTY_EXTRACTION, "error": str(exc)}

    merged = _normalize(parsed, current)
    merged = _apply_relative_dates(merged, state["message"])
    merged = _infer_outcome(merged)
    updated = _diff_fields(current, merged)
    return {"extracted": merged, "updated_fields": updated}


def refine_node(state: AgentState) -> AgentState:
    """Multi-turn refine: apply edit commands to the current form via LLM."""
    llm = get_llm(temperature=0.0)
    current = state.get("current_form") or {}
    today = date.today().isoformat()
    context = (
        f"TODAY_DATE: {today}\n\n"
        f"CURRENT_FORM:\n{json.dumps(current, default=str)}\n\n"
        f"REFINE_COMMAND:\n{state['message']}"
    )
    messages = [
        SystemMessage(content=prompts.REFINE_SYSTEM),
        *_history_messages(state.get("history", [])),
        HumanMessage(content=context),
    ]
    try:
        resp = llm.invoke(messages)
        parsed = _parse_json(resp.content)
    except Exception as exc:
        return {"extracted": current, "updated_fields": [], "error": str(exc)}

    llm_updated = parsed.pop("updated_fields", []) or []
    before = {**EMPTY_EXTRACTION, **current}
    merged = _normalize(parsed, current)
    merged = _apply_relative_dates(merged, state["message"])
    computed = _diff_fields(before, merged)
    updated_fields = list(dict.fromkeys([*llm_updated, *computed]))
    return {"extracted": merged, "updated_fields": updated_fields}


def compliance_node(state: AgentState) -> AgentState:
    """Compliance Coach: rule-based scoring + optional LLM coaching tip."""
    extracted = state.get("extracted") or {}
    result = score_compliance(extracted)

    if result["completeness_score"] < 80 and (result["missing_fields"] or result["compliance_warnings"]):
        llm = get_llm(temperature=0.2)
        coach_input = (
            f"Score: {result['completeness_score']}%\n"
            f"Missing: {result['missing_fields']}\n"
            f"Warnings: {result['compliance_warnings']}\n"
            f"Data: {json.dumps(extracted, default=str)}"
        )
        try:
            resp = llm.invoke([
                SystemMessage(content=prompts.COMPLIANCE_COACH_SYSTEM),
                HumanMessage(content=coach_input),
            ])
            tip = resp.content.strip()
            if tip:
                result["compliance_warnings"] = [*result["compliance_warnings"], tip]
        except Exception:
            pass

    return {
        "completeness_score": result["completeness_score"],
        "missing_fields": result["missing_fields"],
        "compliance_warnings": result["compliance_warnings"],
        "checklist": result["checklist"],
        "ready_to_save": result["ready_to_save"],
    }


def followup_planner_node(state: AgentState) -> AgentState:
    """Smart Follow-up Planner: LLM suggests 2-3 next actions."""
    extracted = state.get("extracted") or {}
    if not extracted.get("hcp_name") or not extracted.get("topics_discussed"):
        return {"followup_suggestions": []}

    llm = get_llm(temperature=0.4)
    messages = [
        SystemMessage(content=prompts.FOLLOWUP_PLANNER_SYSTEM),
        HumanMessage(content=json.dumps(extracted, default=str)),
    ]
    try:
        resp = llm.invoke(messages)
        suggestions = _parse_json_array(resp.content)
        clean = []
        for s in suggestions[:3]:
            if isinstance(s, dict) and s.get("action"):
                clean.append({
                    "action": str(s["action"]),
                    "due_in_days": int(s["due_in_days"]) if s.get("due_in_days") is not None else None,
                    "reason": str(s.get("reason", "")),
                })
        return {"followup_suggestions": clean}
    except Exception:
        return {"followup_suggestions": []}


def confirm_node(state: AgentState) -> AgentState:
    llm = get_llm(temperature=0.3)
    payload = {
        "extracted": state.get("extracted", {}),
        "updated_fields": state.get("updated_fields", []),
        "intent": state.get("intent"),
        "completeness_score": state.get("completeness_score", 0),
        "missing_fields": state.get("missing_fields", []),
        "followup_suggestions": state.get("followup_suggestions", []),
    }
    messages = [
        SystemMessage(content=prompts.REPLY_SYSTEM),
        HumanMessage(content=json.dumps(payload, default=str)),
    ]
    try:
        resp = llm.invoke(messages)
        reply = resp.content.strip()
    except Exception as exc:
        reply = f"I updated the form on the left. ({exc})"

    if state.get("intent") == "refine_interaction" and state.get("updated_fields"):
        fields = ", ".join(state["updated_fields"])
        reply = f"Updated: {fields}. {reply}"

    return {"reply": reply}


def chat_node(state: AgentState) -> AgentState:
    llm = get_llm(temperature=0.5)
    messages = [
        SystemMessage(content=prompts.CHAT_SYSTEM),
        *_history_messages(state.get("history", [])),
        HumanMessage(content=state["message"]),
    ]
    try:
        resp = llm.invoke(messages)
        reply = resp.content.strip()
    except Exception as exc:
        reply = f"Sorry, I couldn't reach the language model right now. ({exc})"
    return {
        "reply": reply,
        "extracted": None,
        "ready_to_save": False,
        "followup_suggestions": [],
        "completeness_score": 0,
        "checklist": [],
    }


def _route(state: AgentState) -> str:
    return state.get("intent", "chat")


def build_graph():
    graph = StateGraph(AgentState)
    graph.add_node("router", router_node)
    graph.add_node("extract", extract_node)
    graph.add_node("refine", refine_node)
    graph.add_node("compliance", compliance_node)
    graph.add_node("followup", followup_planner_node)
    graph.add_node("confirm", confirm_node)
    graph.add_node("chat", chat_node)

    graph.add_edge(START, "router")
    graph.add_conditional_edges(
        "router",
        _route,
        {
            "log_interaction": "extract",
            "refine_interaction": "refine",
            "chat": "chat",
        },
    )
    graph.add_edge("extract", "compliance")
    graph.add_edge("refine", "compliance")
    graph.add_edge("compliance", "followup")
    graph.add_edge("followup", "confirm")
    graph.add_edge("confirm", END)
    graph.add_edge("chat", END)
    return graph.compile()


_COMPILED = None


def get_compiled_graph():
    global _COMPILED
    if _COMPILED is None:
        _COMPILED = build_graph()
    return _COMPILED


def run_agent(
    message: str,
    history: list[dict[str, str]] | None = None,
    current_form: dict[str, Any] | None = None,
) -> dict[str, Any]:
    graph = get_compiled_graph()
    initial: AgentState = {
        "message": message,
        "history": history or [],
        "current_form": current_form or {},
    }
    result = graph.invoke(initial)
    return {
        "reply": result.get("reply", ""),
        "intent": result.get("intent", "chat"),
        "extracted": result.get("extracted"),
        "ready_to_save": result.get("ready_to_save", False),
        "updated_fields": result.get("updated_fields", []),
        "completeness_score": result.get("completeness_score", 0),
        "missing_fields": result.get("missing_fields", []),
        "compliance_warnings": result.get("compliance_warnings", []),
        "checklist": result.get("checklist", []),
        "followup_suggestions": result.get("followup_suggestions", []),
    }
