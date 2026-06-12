"""Service for method version management."""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.models.method_version import MethodVersion
from app.models.project import Project
from app.schemas.method_version import MethodVersionCreate, MethodVersionUpdate

logger = logging.getLogger(__name__)


class MethodVersionService:
    """Manages method versions for research projects."""

    def create_version(self, project_id: int, data: MethodVersionCreate, db: Session) -> MethodVersion:
        """
        Create a new method version for the project.
        Auto-assigns version_number as max(existing) + 1.
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with id {project_id} not found")

        # Determine next version number
        max_version = (
            db.query(sa_func.max(MethodVersion.version_number))
            .filter(MethodVersion.project_id == project_id)
            .scalar()
        )
        next_version = (max_version or 0) + 1

        version = MethodVersion(
            project_id=project_id,
            version_number=next_version,
            name=data.name,
            description=data.description or "",
            key_changes=data.key_changes or [],
            rationale=data.rationale or "",
            based_on_idea_id=data.based_on_idea_id,
            parent_version_id=data.parent_version_id,
            status="draft",
        )
        db.add(version)
        db.commit()
        db.refresh(version)
        return version

    def list_versions(self, project_id: int, db: Session) -> list[MethodVersion]:
        """Return all method versions for a project, ordered by version_number."""
        return (
            db.query(MethodVersion)
            .filter(MethodVersion.project_id == project_id)
            .order_by(MethodVersion.version_number.asc())
            .all()
        )

    def get_version(self, version_id: int, db: Session) -> MethodVersion:
        """Return a single method version by ID."""
        version = db.query(MethodVersion).filter(MethodVersion.id == version_id).first()
        if not version:
            raise ValueError(f"MethodVersion with id {version_id} not found")
        return version

    def update_version(self, version_id: int, data: MethodVersionUpdate, db: Session) -> MethodVersion:
        """Update fields on an existing method version."""
        version = db.query(MethodVersion).filter(MethodVersion.id == version_id).first()
        if not version:
            raise ValueError(f"MethodVersion with id {version_id} not found")

        update_data = data.model_dump(exclude_unset=True)
        for field_name, value in update_data.items():
            setattr(version, field_name, value)

        db.commit()
        db.refresh(version)
        return version

    def archive_version(self, version_id: int, db: Session) -> MethodVersion:
        """Set a method version's status to 'archived'."""
        version = db.query(MethodVersion).filter(MethodVersion.id == version_id).first()
        if not version:
            raise ValueError(f"MethodVersion with id {version_id} not found")

        version.status = "archived"
        db.commit()
        db.refresh(version)
        return version
