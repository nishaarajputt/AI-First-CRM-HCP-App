from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class InteractionBase(BaseModel):
    hcp_name: str = Field(default="", description="Name of the Healthcare Professional")
    interaction_type: str = Field(default="Meeting")
    interaction_date: Optional[str] = None
    interaction_time: Optional[str] = None
    attendees: list[str] = Field(default_factory=list)
    topics_discussed: Optional[str] = None
    materials_shared: list[str] = Field(default_factory=list)
    samples_distributed: list[str] = Field(default_factory=list)
    sentiment: Optional[str] = None
    follow_up_actions: Optional[str] = None
    outcome: Optional[str] = None


class InteractionCreate(InteractionBase):
    source: str = "form"


class InteractionUpdate(InteractionBase):
    pass


class InteractionOut(InteractionBase):
    id: int
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    # Current values already present in the form, so the agent can merge/update.
    current_form: Optional[InteractionBase] = None


class ExtractedInteraction(InteractionBase):
    """Structured fields the agent extracted from natural language."""


class ComplianceCheckItem(BaseModel):
    field: str
    label: str
    complete: bool
    required: bool


class FollowupSuggestion(BaseModel):
    action: str
    due_in_days: Optional[int] = None
    reason: str = ""


class ChatResponse(BaseModel):
    reply: str
    intent: str
    extracted: Optional[ExtractedInteraction] = None
    ready_to_save: bool = False
    # Multi-turn refine
    updated_fields: list[str] = Field(default_factory=list)
    # Compliance Coach
    completeness_score: int = 0
    missing_fields: list[str] = Field(default_factory=list)
    compliance_warnings: list[str] = Field(default_factory=list)
    checklist: list[ComplianceCheckItem] = Field(default_factory=list)
    # Smart Follow-up Planner
    followup_suggestions: list[FollowupSuggestion] = Field(default_factory=list)
