"""Paper chunk retrieval and PDF re-parsing endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.paper import Paper
from app.models.paper_chunk import PaperChunk
from app.schemas.paper_chunk import PaperChunkResponse
from app.services.pdf_parsing import PDFParsingService

router = APIRouter(tags=["chunks"])


@router.get("/papers/{paper_id}/chunks", response_model=list[PaperChunkResponse])
def get_paper_chunks(paper_id: int, db: Session = Depends(get_db)):
    """Get all chunks for a paper, ordered by chunk_index."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    chunks = (
        db.query(PaperChunk)
        .filter(PaperChunk.paper_id == paper_id)
        .order_by(PaperChunk.chunk_index)
        .all()
    )
    return chunks


@router.post("/papers/{paper_id}/reparse")
def reparse_paper(paper_id: int, db: Session = Depends(get_db)):
    """Re-trigger PDF parsing for a paper."""
    try:
        PDFParsingService().parse_and_chunk(paper_id, db)
        return {"message": "Reparse triggered", "status": "ok"}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
