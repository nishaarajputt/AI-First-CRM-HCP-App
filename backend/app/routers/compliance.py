from fastapi import APIRouter

from app import schemas
from app.agent.compliance import score_compliance

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


@router.post("/score")
def compliance_score(payload: schemas.InteractionBase) -> dict:
    """Re-score the current form (e.g. after accepting a follow-up suggestion)."""
    return score_compliance(payload.model_dump())
