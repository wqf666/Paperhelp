"""Service for managing citations: CRUD, BibTeX import/export."""
import logging
from sqlalchemy.orm import Session
from app.models.citation import Citation
from app.models.project import Project
from app.parsers.bibtex_parser import BibTeXParser

logger = logging.getLogger(__name__)

class CitationService:
    """Manages project citations with BibTeX import/export."""

    def __init__(self):
        self.parser = BibTeXParser()

    def import_bibtex(self, project_id: int, bibtex_text: str, db: Session) -> list[Citation]:
        """Parse BibTeX text and create Citation records. Returns list of created citations."""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        entries = self.parser.parse(bibtex_text)
        created = []
        for entry in entries:
            data = self.parser.entry_to_citation_data(entry)
            # Check if cite_key already exists in this project
            existing = db.query(Citation).filter(
                Citation.project_id == project_id,
                Citation.cite_key == data["cite_key"]
            ).first()
            if existing:
                # Update existing
                for key, value in data.items():
                    if key != "cite_key":
                        setattr(existing, key, value)
                created.append(existing)
            else:
                citation = Citation(project_id=project_id, **data)
                db.add(citation)
                created.append(citation)
        
        db.commit()
        for c in created:
            db.refresh(c)
        return created

    def create_citation(self, project_id: int, data: dict, db: Session) -> Citation:
        """Create a single citation manually."""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        citation = Citation(project_id=project_id, **data)
        db.add(citation)
        db.commit()
        db.refresh(citation)
        return citation

    def list_citations(self, project_id: int, db: Session, search: str = "") -> list[Citation]:
        """List citations for a project, optionally filtered by search term."""
        query = db.query(Citation).filter(Citation.project_id == project_id)
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Citation.title.ilike(search_pattern)) |
                (Citation.authors.ilike(search_pattern)) |
                (Citation.cite_key.ilike(search_pattern))
            )
        return query.order_by(Citation.created_at.desc()).all()

    def get_citation(self, citation_id: int, db: Session) -> Citation:
        """Get a single citation."""
        citation = db.query(Citation).filter(Citation.id == citation_id).first()
        if not citation:
            raise ValueError(f"Citation {citation_id} not found")
        return citation

    def update_citation(self, citation_id: int, data: dict, db: Session) -> Citation:
        """Update a citation."""
        citation = db.query(Citation).filter(Citation.id == citation_id).first()
        if not citation:
            raise ValueError(f"Citation {citation_id} not found")
        for key, value in data.items():
            if value is not None:
                setattr(citation, key, value)
        db.commit()
        db.refresh(citation)
        return citation

    def delete_citation(self, citation_id: int, db: Session):
        """Delete a citation."""
        citation = db.query(Citation).filter(Citation.id == citation_id).first()
        if not citation:
            raise ValueError(f"Citation {citation_id} not found")
        db.delete(citation)
        db.commit()

    def export_bibtex(self, project_id: int, db: Session) -> str:
        """Export all citations for a project as BibTeX text."""
        citations = db.query(Citation).filter(
            Citation.project_id == project_id
        ).order_by(Citation.created_at).all()
        return self.parser.serialize(citations)
