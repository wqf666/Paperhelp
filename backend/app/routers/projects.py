"""Project management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new research project."""
    project = Project(
        name=payload.name,
        description=payload.description,
        target_field=payload.target_field,
        target_venue=payload.target_venue,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _build_response(project)


@router.get("/", response_model=list[ProjectResponse])
def list_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all research projects with pagination."""
    projects = db.query(Project).offset(skip).limit(limit).all()
    return [_build_response(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a single project, including resource counts."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _build_response(project)


def _build_response(project: Project) -> ProjectResponse:
    """Build a ProjectResponse with computed counts from ORM relationships."""
    papers = project.papers or []
    ideas = project.research_ideas or []
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description or "",
        target_field=project.target_field or "",
        target_venue=project.target_venue or "",
        created_at=project.created_at,
        updated_at=project.updated_at,
        paper_count=len(papers),
        idea_count=len(ideas),
        papers=papers,
        research_ideas=ideas,
    )
