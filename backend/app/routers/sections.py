"""Manuscript section management endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.manuscript_state import ManuscriptState
from app.models.manuscript_section import ManuscriptSection
from app.schemas.manuscript_section import (
    ManuscriptSectionCreate,
    ManuscriptSectionUpdate,
    ManuscriptSectionResponse,
)

router = APIRouter(tags=["sections"])


class SectionReorderItem(BaseModel):
    id: int
    sort_order: int


@router.get(
    "/projects/{project_id}/manuscript/sections",
    response_model=list[ManuscriptSectionResponse],
)
def get_manuscript_sections(project_id: int, db: Session = Depends(get_db)):
    """Get all sections for a project's manuscript, ordered by sort_order."""
    manuscript = (
        db.query(ManuscriptState)
        .filter(ManuscriptState.project_id == project_id)
        .first()
    )
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    sections = (
        db.query(ManuscriptSection)
        .filter(ManuscriptSection.manuscript_state_id == manuscript.id)
        .order_by(ManuscriptSection.sort_order)
        .all()
    )
    return sections


@router.put(
    "/manuscript-sections/{section_id}",
    response_model=ManuscriptSectionResponse,
)
def update_manuscript_section(
    section_id: int,
    payload: ManuscriptSectionUpdate,
    db: Session = Depends(get_db),
):
    """Update a manuscript section's content."""
    section = (
        db.query(ManuscriptSection)
        .filter(ManuscriptSection.id == section_id)
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Manuscript section not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(section, key, value)

    db.commit()
    db.refresh(section)
    return section


@router.post(
    "/projects/{project_id}/manuscript/sections",
    response_model=ManuscriptSectionResponse,
    status_code=201,
)
def create_manuscript_section(
    project_id: int,
    payload: ManuscriptSectionCreate,
    db: Session = Depends(get_db),
):
    """Create a new manuscript section."""
    manuscript = (
        db.query(ManuscriptState)
        .filter(ManuscriptState.project_id == project_id)
        .first()
    )
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    section = ManuscriptSection(
        manuscript_state_id=manuscript.id,
        section_key=payload.section_key,
        title=payload.title,
        content=payload.content,
        sort_order=payload.sort_order,
        method_version_id=payload.method_version_id,
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.delete(
    "/manuscript-sections/{section_id}",
)
def delete_manuscript_section(
    section_id: int,
    db: Session = Depends(get_db),
):
    """Delete a manuscript section."""
    section = (
        db.query(ManuscriptSection)
        .filter(ManuscriptSection.id == section_id)
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Manuscript section not found")

    db.delete(section)
    db.commit()
    return {"message": "Deleted"}


@router.put(
    "/projects/{project_id}/manuscript/sections/reorder",
    response_model=list[ManuscriptSectionResponse],
)
def reorder_manuscript_sections(
    project_id: int,
    payload: List[SectionReorderItem],
    db: Session = Depends(get_db),
):
    """Reorder manuscript sections by updating sort_order values."""
    manuscript = (
        db.query(ManuscriptState)
        .filter(ManuscriptState.project_id == project_id)
        .first()
    )
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    for item in payload:
        section = (
            db.query(ManuscriptSection)
            .filter(
                ManuscriptSection.id == item.id,
                ManuscriptSection.manuscript_state_id == manuscript.id,
            )
            .first()
        )
        if section:
            section.sort_order = item.sort_order

    db.commit()

    sections = (
        db.query(ManuscriptSection)
        .filter(ManuscriptSection.manuscript_state_id == manuscript.id)
        .order_by(ManuscriptSection.sort_order)
        .all()
    )
    return sections
