"""Research idea generation endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.models.research_idea import ResearchIdea
from app.schemas.research_idea import IdeaGenerateRequest, ResearchIdeaResponse
from app.services.idea_generation import IdeaGenerationService
from app.services.differentiation_service import DifferentiationService

router = APIRouter(tags=["ideas"])


@router.post(
    "/projects/{project_id}/ideas/generate",
    response_model=list[ResearchIdeaResponse],
    status_code=201,
)
def generate_ideas(
    project_id: int,
    payload: IdeaGenerateRequest,
    db: Session = Depends(get_db),
):
    """Generate research ideas for a project based on analysed paper cards."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        service = IdeaGenerationService()
        ideas = service.generate_ideas(
            project_id=project_id,
            research_field=payload.research_field,
            additional_context=payload.additional_context,
            db=db,
        )
        return ideas
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/projects/{project_id}/ideas", response_model=list[ResearchIdeaResponse])
def list_ideas(project_id: int, db: Session = Depends(get_db)):
    """List all research ideas belonging to a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return db.query(ResearchIdea).filter(ResearchIdea.project_id == project_id).all()


@router.post("/ideas/{idea_id}/differentiation-check")
def differentiation_check(idea_id: int, db: Session = Depends(get_db)):
    """Run differentiation analysis for a research idea."""
    idea = db.query(ResearchIdea).filter(ResearchIdea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Research idea not found")

    try:
        service = DifferentiationService()
        service.check_differentiation(idea_id, db)
        db.refresh(idea)
        return {"differentiation_check": idea.differentiation_check}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
