"""Manuscript outline generation and state management endpoints."""

from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.manuscript_state import ManuscriptState
from app.models.project import Project
from app.schemas.manuscript import OutlineGenerateRequest, ManuscriptStateResponse
from app.services.manuscript_service import ManuscriptService

router = APIRouter(tags=["manuscript"])


class OutlineUpdateRequest(BaseModel):
    outline: List[Dict[str, Any]]


class ManuscriptUpdateRequest(BaseModel):
    title: Optional[str] = None
    abstract: Optional[str] = None
    contributions: Optional[List[str]] = None


@router.post(
    "/projects/{project_id}/manuscript/outline/generate",
    response_model=ManuscriptStateResponse,
    status_code=201,
)
def generate_outline(
    project_id: int,
    payload: OutlineGenerateRequest,
    db: Session = Depends(get_db),
):
    """Generate a manuscript outline for a project based on its ideas and paper cards."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        service = ManuscriptService()
        manuscript = service.generate_outline(
            project_id=project_id,
            additional_instructions=payload.additional_instructions,
            db=db,
        )
        return manuscript
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/projects/{project_id}/manuscript", response_model=ManuscriptStateResponse)
def get_manuscript_state(project_id: int, db: Session = Depends(get_db)):
    """Retrieve the current manuscript state for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    manuscript = db.query(ManuscriptState).filter(ManuscriptState.project_id == project_id).first()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found. Generate an outline first.")

    return manuscript


@router.put("/projects/{project_id}/manuscript/outline", response_model=ManuscriptStateResponse)
def update_outline(
    project_id: int,
    payload: OutlineUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update the manuscript outline (full replacement of the outline JSON)."""
    manuscript = db.query(ManuscriptState).filter(ManuscriptState.project_id == project_id).first()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    manuscript.outline = payload.outline
    db.commit()
    db.refresh(manuscript)
    return manuscript


@router.put("/projects/{project_id}/manuscript", response_model=ManuscriptStateResponse)
def update_manuscript(
    project_id: int,
    payload: ManuscriptUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update manuscript title, abstract, and/or contributions."""
    manuscript = db.query(ManuscriptState).filter(ManuscriptState.project_id == project_id).first()
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    if payload.title is not None:
        manuscript.title = payload.title
    if payload.abstract is not None:
        manuscript.abstract = payload.abstract
    if payload.contributions is not None:
        manuscript.contributions = payload.contributions

    db.commit()
    db.refresh(manuscript)
    return manuscript
