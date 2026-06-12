"""Citation management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.schemas.citation import CitationCreate, CitationUpdate, CitationResponse
from app.services.citation_service import CitationService

router = APIRouter(tags=["citations"])


@router.post(
    "/projects/{project_id}/citations/import-bibtex",
    response_model=list[CitationResponse],
    status_code=201,
)
async def import_bibtex(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a BibTeX file and import citations."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    content = await file.read()
    bibtex_text = content.decode("utf-8")

    service = CitationService()
    try:
        citations = service.import_bibtex(project_id, bibtex_text, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return citations


@router.post(
    "/projects/{project_id}/citations",
    response_model=CitationResponse,
    status_code=201,
)
def create_citation(
    project_id: int,
    payload: CitationCreate,
    db: Session = Depends(get_db),
):
    """Create a single citation manually."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = CitationService()
    try:
        citation = service.create_citation(project_id, payload.model_dump(), db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return citation


@router.get(
    "/projects/{project_id}/citations",
    response_model=list[CitationResponse],
)
def list_citations(
    project_id: int,
    search: str = "",
    db: Session = Depends(get_db),
):
    """List all citations for a project with optional search."""
    service = CitationService()
    return service.list_citations(project_id, db, search=search)


@router.get(
    "/citations/{citation_id}",
    response_model=CitationResponse,
)
def get_citation(citation_id: int, db: Session = Depends(get_db)):
    """Get a single citation."""
    service = CitationService()
    try:
        citation = service.get_citation(citation_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Citation not found")
    return citation


@router.put(
    "/citations/{citation_id}",
    response_model=CitationResponse,
)
def update_citation(
    citation_id: int,
    payload: CitationUpdate,
    db: Session = Depends(get_db),
):
    """Update a citation."""
    service = CitationService()
    try:
        citation = service.update_citation(
            citation_id, payload.model_dump(exclude_unset=True), db
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Citation not found")
    return citation


@router.delete(
    "/citations/{citation_id}",
)
def delete_citation(citation_id: int, db: Session = Depends(get_db)):
    """Delete a citation."""
    service = CitationService()
    try:
        service.delete_citation(citation_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Citation not found")
    return {"message": "Deleted"}


@router.get(
    "/projects/{project_id}/citations/export-bibtex",
)
def export_bibtex(project_id: int, db: Session = Depends(get_db)):
    """Export all citations for a project as BibTeX text."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = CitationService()
    bibtex_text = service.export_bibtex(project_id, db)
    return Response(content=bibtex_text, media_type="text/plain")
