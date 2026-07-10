from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Interaction(Base):
    """A single logged interaction between a field rep and an HCP."""

    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    hcp_name: Mapped[str] = mapped_column(String(255), index=True)
    interaction_type: Mapped[str] = mapped_column(String(64), default="Meeting")
    interaction_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    interaction_time: Mapped[str | None] = mapped_column(String(32), nullable=True)

    attendees: Mapped[list] = mapped_column(JSON, default=list)
    topics_discussed: Mapped[str | None] = mapped_column(Text, nullable=True)
    materials_shared: Mapped[list] = mapped_column(JSON, default=list)
    samples_distributed: Mapped[list] = mapped_column(JSON, default=list)

    sentiment: Mapped[str | None] = mapped_column(String(32), nullable=True)
    follow_up_actions: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)

    source: Mapped[str] = mapped_column(String(32), default="form")  # form | chat

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
