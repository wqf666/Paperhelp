"""Export endpoints for DOCX, LaTeX, BibTeX, Cover Letter, Response Letter."""

import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.manuscript_state import ManuscriptState
from app.models.export_record import ExportRecord
from app.schemas.export_record import ExportRecordResponse
from app.schemas.export_request import ExportRequest
from app.schemas.cover_letter import CoverLetterRequest
from app.schemas.response_letter import ResponseLetterRequest
from app.services.docx_generator import DocxGeneratorService
from app.services.latex_generator import LatexGeneratorService
from app.services.cover_letter_service import CoverLetterService
from app.services.response_letter_service import ResponseLetterService
from app.services.citation_service import CitationService

router = APIRouter(tags=["export"])


def _get_manuscript(project_id: int, db: Session) -> ManuscriptState:
    """Retrieve the manuscript for a project or raise 404."""
    manuscript = (
        db.query(ManuscriptState)
        .filter(ManuscriptState.project_id == project_id)
        .first()
    )
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found for this project")
    return manuscript


@router.post(
    "/projects/{project_id}/export/docx",
    response_model=ExportRecordResponse,
)
def export_docx(
    project_id: int,
    payload: ExportRequest,
    db: Session = Depends(get_db),
):
    """Export manuscript as a Word DOCX file."""
    manuscript = _get_manuscript(project_id, db)
    try:
        service = DocxGeneratorService()
        record = service.generate(manuscript.id, payload.template_id, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return record


@router.post(
    "/projects/{project_id}/export/latex",
    response_model=ExportRecordResponse,
)
def export_latex(
    project_id: int,
    payload: ExportRequest,
    db: Session = Depends(get_db),
):
    """Export manuscript as a LaTeX project package."""
    manuscript = _get_manuscript(project_id, db)
    try:
        service = LatexGeneratorService()
        record = service.generate(manuscript.id, payload.template_id, db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return record


@router.post(
    "/projects/{project_id}/export/bibtex",
    response_model=ExportRecordResponse,
)
def export_bibtex(
    project_id: int,
    db: Session = Depends(get_db),
):
    """Export all project citations as a BibTeX file."""
    manuscript = _get_manuscript(project_id, db)

    citation_service = CitationService()
    bibtex_text = citation_service.export_bibtex(project_id, db)

    # Save to file
    export_dir = os.path.join(settings.EXPORT_PATH, str(project_id))
    os.makedirs(export_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"{timestamp}_references.bib"
    file_path = os.path.join(export_dir, file_name)
    with open(file_path, "w", encoding="utf-8") as fh:
        fh.write(bibtex_text)
    file_size = os.path.getsize(file_path)

    # Create export record
    record = ExportRecord(
        project_id=project_id,
        manuscript_state_id=manuscript.id,
        export_type="bibtex",
        file_path=file_path,
        file_name=file_name,
        file_size=file_size,
        status="completed",
        completed_at=datetime.now(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post(
    "/projects/{project_id}/export/cover-letter",
    response_model=ExportRecordResponse,
)
def export_cover_letter(
    project_id: int,
    payload: CoverLetterRequest,
    db: Session = Depends(get_db),
):
    """Generate a cover letter DOCX for submission."""
    manuscript = _get_manuscript(project_id, db)
    try:
        service = CoverLetterService()
        record = service.generate(
            manuscript_id=manuscript.id,
            recipient_name=payload.recipient_name,
            recipient_title=payload.recipient_title,
            journal_or_conference=payload.journal_or_conference,
            additional_notes=payload.additional_notes,
            db=db,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return record


@router.post(
    "/projects/{project_id}/export/response-letter",
    response_model=ExportRecordResponse,
)
def export_response_letter(
    project_id: int,
    payload: ResponseLetterRequest,
    db: Session = Depends(get_db),
):
    """Generate a point-by-point response letter to reviewer comments."""
    manuscript = _get_manuscript(project_id, db)
    try:
        service = ResponseLetterService()
        record = service.generate(
            manuscript_id=manuscript.id,
            additional_context=payload.additional_context,
            db=db,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return record


@router.get(
    "/exports/{export_id}",
    response_model=ExportRecordResponse,
)
def get_export_record(export_id: int, db: Session = Depends(get_db)):
    """Get a single export record."""
    record = db.query(ExportRecord).filter(ExportRecord.id == export_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Export record not found")
    return record


@router.get("/exports/{export_id}/download")
def download_export(export_id: int, db: Session = Depends(get_db)):
    """Download the generated file for a given export record."""
    record = db.query(ExportRecord).filter(ExportRecord.id == export_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Export record not found")
    if not record.file_path or not os.path.exists(record.file_path):
        raise HTTPException(status_code=404, detail="Export file not found")
    return FileResponse(
        record.file_path,
        filename=record.file_name or "export",
        media_type="application/octet-stream",
    )
