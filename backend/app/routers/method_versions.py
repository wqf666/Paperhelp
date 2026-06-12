"""Method version management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.schemas.method_version import MethodVersionCreate, MethodVersionUpdate, MethodVersionResponse
from app.services.method_version_service import MethodVersionService

router = APIRouter(tags=["method-versions"])


@router.post(
    "/projects/{project_id}/method-versions",
    response_model=MethodVersionResponse,
    status_code=201,
)
def create_method_version(
    project_id: int,
    payload: MethodVersionCreate,
    db: Session = Depends(get_db),
):
    """Create a new method version for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    service = MethodVersionService()
    version = service.create_version(project_id, payload, db)
    return version


@router.get(
    "/projects/{project_id}/method-versions",
    response_model=list[MethodVersionResponse],
)
def list_method_versions(project_id: int, db: Session = Depends(get_db)):
    """List all method versions for a project."""
    service = MethodVersionService()
    return service.list_versions(project_id, db)


@router.get(
    "/projects/{project_id}/method-versions/{version_id}",
    response_model=MethodVersionResponse,
)
def get_method_version(
    project_id: int, version_id: int, db: Session = Depends(get_db)
):
    """Get a single method version."""
    service = MethodVersionService()
    try:
        version = service.get_version(version_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Method version not found")
    if not version or version.project_id != project_id:
        raise HTTPException(status_code=404, detail="Method version not found")
    return version


@router.put(
    "/projects/{project_id}/method-versions/{version_id}",
    response_model=MethodVersionResponse,
)
def update_method_version(
    project_id: int,
    version_id: int,
    payload: MethodVersionUpdate,
    db: Session = Depends(get_db),
):
    """Update a method version."""
    service = MethodVersionService()
    try:
        version = service.get_version(version_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Method version not found")
    if not version or version.project_id != project_id:
        raise HTTPException(status_code=404, detail="Method version not found")

    updated = service.update_version(version_id, payload, db)
    return updated


@router.post(
    "/projects/{project_id}/method-versions/{version_id}/archive",
    response_model=MethodVersionResponse,
)
def archive_method_version(
    project_id: int, version_id: int, db: Session = Depends(get_db)
):
    """Archive a method version (set status to 'archived')."""
    service = MethodVersionService()
    try:
        version = service.get_version(version_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Method version not found")
    if not version or version.project_id != project_id:
        raise HTTPException(status_code=404, detail="Method version not found")

    archived = service.archive_version(version_id, db)
    return archived
