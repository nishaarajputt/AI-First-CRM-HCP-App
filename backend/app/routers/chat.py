from fastapi import APIRouter, HTTPException

from app import schemas
from app.agent import run_agent

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=schemas.ChatResponse)
def chat(payload: schemas.ChatRequest):
    if not payload.message.strip():
        raise HTTPException(status_code=422, detail="message is required")

    history = [m.model_dump() for m in payload.history]
    current_form = payload.current_form.model_dump() if payload.current_form else {}

    try:
        result = run_agent(
            message=payload.message,
            history=history,
            current_form=current_form,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    extracted = result.get("extracted")
    return schemas.ChatResponse(
        reply=result.get("reply", ""),
        intent=result.get("intent", "chat"),
        extracted=schemas.ExtractedInteraction(**extracted) if extracted else None,
        ready_to_save=result.get("ready_to_save", False),
        updated_fields=result.get("updated_fields", []),
        completeness_score=result.get("completeness_score", 0),
        missing_fields=result.get("missing_fields", []),
        compliance_warnings=result.get("compliance_warnings", []),
        checklist=[schemas.ComplianceCheckItem(**c) for c in result.get("checklist", [])],
        followup_suggestions=[
            schemas.FollowupSuggestion(**s) for s in result.get("followup_suggestions", [])
        ],
    )
