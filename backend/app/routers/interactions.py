from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/api/interactions", tags=["interactions"])


@router.post("", response_model=schemas.InteractionOut, status_code=201)
def create_interaction(payload: schemas.InteractionCreate, db: Session = Depends(get_db)):
    if not payload.hcp_name.strip():
        raise HTTPException(status_code=422, detail="hcp_name is required")
    return crud.create_interaction(db, payload)


@router.get("", response_model=list[schemas.InteractionOut])
def list_interactions(limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_interactions(db, limit=limit)


@router.get("/{interaction_id}", response_model=schemas.InteractionOut)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    interaction = crud.get_interaction(db, interaction_id)
    if interaction is None:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return interaction


@router.put("/{interaction_id}", response_model=schemas.InteractionOut)
def update_interaction(
    interaction_id: int,
    payload: schemas.InteractionUpdate,
    db: Session = Depends(get_db),
):
    updated = crud.update_interaction(db, interaction_id, payload)
    if updated is None:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return updated


@router.delete("/{interaction_id}", status_code=204)
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    if not crud.delete_interaction(db, interaction_id):
        raise HTTPException(status_code=404, detail="Interaction not found")
    return None
