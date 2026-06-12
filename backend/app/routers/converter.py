"""Format conversion endpoints."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.models.manuscript_state import ManuscriptState
from app.models.manuscript_section import ManuscriptSection
from app.models.paper import Paper
from app.models.paper_card import PaperCard
from app.models.research_idea import ResearchIdea
from app.schemas.manuscript_section import ManuscriptSectionResponse
from app.services.word_to_latex_converter import WordToLatexConverter
from app.services.llm_service import get_llm_service
from app.config import settings

router = APIRouter(tags=["converter"])


@router.post("/convert/word-to-latex")
async def convert_word_to_latex(
    file: UploadFile = File(...),
):
    """Convert a Word DOCX file to LaTeX source."""
    content = await file.read()
    filename = file.filename or "document.docx"

    converter = WordToLatexConverter()
    result = converter.convert(content, filename)
    return result


@router.post(
    "/projects/{project_id}/manuscript/sections/{section_id}/generate-content",
    response_model=ManuscriptSectionResponse,
)
def generate_section_content(
    project_id: int,
    section_id: int,
    db: Session = Depends(get_db),
):
    """Generate LLM content for a manuscript section based on project context."""
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Load manuscript
    manuscript = (
        db.query(ManuscriptState)
        .filter(ManuscriptState.project_id == project_id)
        .first()
    )
    if not manuscript:
        raise HTTPException(status_code=404, detail="Manuscript not found")

    # Load section
    section = (
        db.query(ManuscriptSection)
        .filter(
            ManuscriptSection.id == section_id,
            ManuscriptSection.manuscript_state_id == manuscript.id,
        )
        .first()
    )
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Gather context: related ideas
    ideas = (
        db.query(ResearchIdea)
        .filter(ResearchIdea.project_id == project_id)
        .all()
    )
    related_ideas = [
        {"name": idea.name, "research_gap": idea.research_gap, "proposed_solution": idea.proposed_solution}
        for idea in ideas
    ]

    # Gather context: paper cards from project papers
    papers = db.query(Paper).filter(Paper.project_id == project_id).all()
    paper_ids = [p.id for p in papers]
    paper_cards = []
    if paper_ids:
        cards = db.query(PaperCard).filter(PaperCard.paper_id.in_(paper_ids)).all()
        paper_cards = [
            {
                "research_problem": card.research_problem,
                "method_summary": card.method_summary,
                "novelty_points": card.novelty_points if isinstance(card.novelty_points, list) else [],
            }
            for card in cards
        ]

    context = {
        "project_name": project.name,
        "related_ideas": related_ideas,
        "paper_cards": paper_cards,
    }

    # Call LLM
    llm = get_llm_service(settings)
    section_title = section.title or section.section_key
    generated = llm.generate_section_content(section_title, context)

    # Store result
    section.generated_content = generated
    db.commit()
    db.refresh(section)
    return section
