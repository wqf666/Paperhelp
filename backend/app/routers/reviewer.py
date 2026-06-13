"""Reviewer simulation endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.models.reviewer_simulation import ReviewerSimulation
from app.schemas.reviewer_simulation import ReviewerSimulateRequest, ReviewerSimulationResponse
from app.services.reviewer_service import ReviewerService

router = APIRouter(tags=["reviewer"])


@router.post(
    "/projects/{project_id}/reviewer-simulation/generate",
    response_model=list[ReviewerSimulationResponse],
    status_code=201,
)
def generate_reviewer_simulations(
    project_id: int,
    payload: ReviewerSimulateRequest,
    db: Session = Depends(get_db),
):
    """Generate simulated peer reviewer feedback for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        service = ReviewerService()
        simulations = service.simulate_reviewers(
            project_id=project_id,
            num_reviewers=payload.num_reviewers,
            db=db,
        )
        return simulations
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get(
    "/projects/{project_id}/reviewer-simulations",
    response_model=list[ReviewerSimulationResponse],
)
def list_reviewer_simulations(project_id: int, db: Session = Depends(get_db)):
    """List all reviewer simulations for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return (
        db.query(ReviewerSimulation)
        .filter(ReviewerSimulation.project_id == project_id)
        .all()
    )


@router.delete(
    "/projects/{project_id}/reviewer-simulations",
    status_code=204,
)
def delete_all_reviewer_simulations(project_id: int, db: Session = Depends(get_db)):
    """Delete all reviewer simulations for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.query(ReviewerSimulation).filter(
        ReviewerSimulation.project_id == project_id
    ).delete()
    db.commit()
    return None
