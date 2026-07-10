from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas


def create_interaction(db: Session, data: schemas.InteractionCreate) -> models.Interaction:
    interaction = models.Interaction(**data.model_dump())
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


def list_interactions(db: Session, limit: int = 100) -> list[models.Interaction]:
    stmt = select(models.Interaction).order_by(models.Interaction.created_at.desc()).limit(limit)
    return list(db.scalars(stmt).all())


def get_interaction(db: Session, interaction_id: int) -> models.Interaction | None:
    return db.get(models.Interaction, interaction_id)


def update_interaction(
    db: Session, interaction_id: int, data: schemas.InteractionUpdate
) -> models.Interaction | None:
    interaction = db.get(models.Interaction, interaction_id)
    if interaction is None:
        return None
    for key, value in data.model_dump().items():
        setattr(interaction, key, value)
    db.commit()
    db.refresh(interaction)
    return interaction


def delete_interaction(db: Session, interaction_id: int) -> bool:
    interaction = db.get(models.Interaction, interaction_id)
    if interaction is None:
        return False
    db.delete(interaction)
    db.commit()
    return True
