"""Pre-export validation for manuscript completeness."""

from sqlalchemy.orm import Session

from app.models.manuscript_state import ManuscriptState
from app.models.manuscript_section import ManuscriptSection
from app.models.citation import Citation
from app.models.experiment_result import ExperimentResult


class ValidationResult:
    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, msg: str):
        self.errors.append(msg)

    def add_warning(self, msg: str):
        self.warnings.append(msg)


class PreExportValidator:
    """Validates manuscript completeness before export."""

    def validate(self, manuscript_id: int, db: Session) -> ValidationResult:
        result = ValidationResult()

        # Load manuscript
        manuscript = db.query(ManuscriptState).filter(
            ManuscriptState.id == manuscript_id
        ).first()
        if not manuscript:
            result.add_error("Manuscript not found")
            return result

        # Check title and abstract
        if not manuscript.title or not manuscript.title.strip():
            result.add_error("Manuscript title is empty. Generate an outline first.")
        if not manuscript.abstract or not manuscript.abstract.strip():
            result.add_error("Manuscript abstract is empty. Generate an outline first.")

        # Load sections
        sections = (
            db.query(ManuscriptSection)
            .filter(ManuscriptSection.manuscript_state_id == manuscript_id)
            .order_by(ManuscriptSection.sort_order)
            .all()
        )

        # Check at least one section has content
        has_content = any(
            s.content and s.content.strip() for s in sections
        )
        if sections and not has_content:
            result.add_error("All sections are empty. Add content to at least one section.")
        if not sections:
            result.add_warning("No manuscript sections found. Consider generating sections from the outline.")

        # Check citation keys are resolved
        all_cite_keys = set()
        for section in sections:
            keys = section.citation_keys if isinstance(section.citation_keys, list) else []
            all_cite_keys.update(keys)

        if all_cite_keys:
            project_id = manuscript.project_id
            existing_keys = set(
                c.cite_key for c in
                db.query(Citation.cite_key).filter(
                    Citation.project_id == project_id
                ).all()
            )
            missing = all_cite_keys - existing_keys
            if missing:
                result.add_error(
                    f"Unresolved citation keys: {', '.join(sorted(missing))}. "
                    "Import or add these citations first."
                )

        # Check experiment data consistency
        project_id = manuscript.project_id
        experiment_results = (
            db.query(ExperimentResult)
            .filter(ExperimentResult.project_id == project_id)
            .all()
        )
        if experiment_results:
            # Check if any section references experiments
            has_experiment_section = any(
                s.section_key in ("experiments", "results", "evaluation")
                and s.content and s.content.strip()
                for s in sections
            )
            if not has_experiment_section:
                result.add_warning(
                    "Experiment results exist but no experiment/results section has content."
                )

        return result
