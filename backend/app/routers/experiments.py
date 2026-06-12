"""Experiment plan generation endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.experiment_plan import ExperimentPlan
from app.models.research_idea import ResearchIdea
from app.schemas.experiment_plan import ExperimentPlanResponse
from app.services.experiment_planning import ExperimentPlanningService

router = APIRouter(tags=["experiments"])


@router.post(
    "/ideas/{idea_id}/experiment-plan/generate",
    response_model=ExperimentPlanResponse,
    status_code=201,
)
def generate_experiment_plan(idea_id: int, db: Session = Depends(get_db)):
    """Generate a detailed experiment plan for a specific research idea."""
    idea = db.query(ResearchIdea).filter(ResearchIdea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Research idea not found")

    try:
        service = ExperimentPlanningService()
        plan = service.generate_plan(idea_id, db)
        return plan
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/ideas/{idea_id}/experiment-plan", response_model=ExperimentPlanResponse)
def get_experiment_plan(idea_id: int, db: Session = Depends(get_db)):
    """Retrieve the existing experiment plan for a research idea."""
    idea = db.query(ResearchIdea).filter(ResearchIdea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Research idea not found")

    plan = db.query(ExperimentPlan).filter(ExperimentPlan.idea_id == idea_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Experiment plan not found. Generate one first.")

    return plan
