"""Paper management and analysis endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.paper import Paper
from app.models.paper_card import PaperCard
from app.models.project import Project
from app.schemas.paper import PaperCreate, PaperResponse
from app.schemas.paper_card import PaperCardResponse
from app.schemas.evidence_span import EvidenceSpanResponse
from app.services.paper_analysis import PaperAnalysisService
from app.services.evidence_service import EvidenceService
from app.storage.local_storage import LocalStorage
from app.services.pdf_parsing import PDFParsingService

router = APIRouter(tags=["papers"])


@router.post("/projects/{project_id}/papers", response_model=PaperResponse, status_code=201)
def add_paper(project_id: int, payload: PaperCreate, db: Session = Depends(get_db)):
    """Add a new paper record to a project (metadata only, no file upload in MVP)."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    paper = Paper(
        project_id=project_id,
        title=payload.title,
        authors=payload.authors,
        year=payload.year,
        venue=payload.venue,
        doi=payload.doi,
        abstract=payload.abstract,
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper


@router.get("/projects/{project_id}/papers", response_model=list[PaperResponse])
def list_papers(project_id: int, db: Session = Depends(get_db)):
    """List all papers belonging to a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(Paper).filter(Paper.project_id == project_id).all()


@router.post("/papers/{paper_id}/analyze", response_model=PaperCardResponse)
def analyze_paper(paper_id: int, db: Session = Depends(get_db)):
    """Trigger LLM-based analysis of a paper and return the generated paper card."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    try:
        service = PaperAnalysisService()
        card = service.analyze_paper(paper_id, db)
        return card
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/papers/{paper_id}/card", response_model=PaperCardResponse)
def get_paper_card(paper_id: int, db: Session = Depends(get_db)):
    """Retrieve the existing paper card for a previously analysed paper."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    card = db.query(PaperCard).filter(PaperCard.paper_id == paper_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Paper card not found. Analyze the paper first.")

    return card


@router.get("/papers/{paper_id}/card/evidence-spans", response_model=list[EvidenceSpanResponse])
def get_evidence_spans(paper_id: int, db: Session = Depends(get_db)):
    """Get evidence spans for a paper's card."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    card = db.query(PaperCard).filter(PaperCard.paper_id == paper_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Paper card not found. Analyze the paper first.")

    return card.evidence_span_list


@router.post("/projects/{project_id}/papers/upload", response_model=PaperResponse, status_code=201)
async def upload_paper(
    project_id: int,
    title: Optional[str] = Form(None),
    authors: str = Form(""),
    year: Optional[int] = Form(None),
    venue: str = Form(""),
    doi: str = Form(""),
    abstract: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a paper PDF, parse it, and trigger analysis."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save file
    storage = LocalStorage()
    file_content = await file.read()
    file_path = storage.save(file.filename or "paper.pdf", file_content)

    # Fallback: use filename (without extension) as title if none provided
    if not title:
        name = file.filename or "paper.pdf"
        title = name.rsplit(".", 1)[0] if "." in name else name

    # Create paper record
    paper = Paper(
        project_id=project_id,
        title=title,
        authors=authors,
        year=year,
        venue=venue,
        doi=doi,
        abstract=abstract,
        file_path=file_path,
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)

    # NOTE: PDF parsing and AI analysis are NOT triggered automatically.
    # The user can trigger analysis manually via POST /papers/{paper_id}/analyze
    # This saves API costs — AI is only called when the user explicitly requests it.

    db.refresh(paper)
    return paper


@router.delete("/papers/{paper_id}", status_code=204)
def delete_paper(paper_id: int, db: Session = Depends(get_db)):
    """Delete a paper and all associated data (card, chunks, etc.)."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    db.delete(paper)
    db.commit()
    return None
