"""Service for generating and managing manuscript outlines."""

from sqlalchemy.orm import Session

from app.config import settings
from app.models.manuscript_state import ManuscriptState
from app.models.paper import Paper
from app.models.paper_card import PaperCard
from app.models.project import Project
from app.models.research_idea import ResearchIdea
from app.services.llm_service import get_llm_service
from app.compliance.checker import run_compliance_check


class ManuscriptService:
    """Generates manuscript outlines and manages manuscript state for a project."""

    def generate_outline(
        self,
        project_id: int,
        additional_instructions: str,
        db: Session,
    ) -> ManuscriptState:
        """
        Outline generation pipeline:
        1. Validate the project and gather context (ideas + paper cards).
        2. Call the LLM to generate a structured outline.
        3. Persist or update the ManuscriptState record.
        4. Return the ManuscriptState.
        """
        # 1. Validate project
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with id {project_id} not found")

        # 2. Gather ideas
        ideas = db.query(ResearchIdea).filter(ResearchIdea.project_id == project_id).all()
        ideas_dicts = [
            {
                "name": i.name,
                "research_gap": i.research_gap,
                "proposed_solution": i.proposed_solution,
                "expected_contributions": i.expected_contributions if isinstance(i.expected_contributions, list) else [],
            }
            for i in ideas
        ]

        # 3. Gather paper cards
        paper_ids = [p.id for p in db.query(Paper).filter(Paper.project_id == project_id).all()]
        paper_cards = (
            db.query(PaperCard).filter(PaperCard.paper_id.in_(paper_ids)).all() if paper_ids else []
        )
        cards_dicts = [
            {
                "research_problem": c.research_problem,
                "method_summary": c.method_summary,
                "novelty_points": c.novelty_points if isinstance(c.novelty_points, list) else [],
            }
            for c in paper_cards
        ]

        project_dict = {
            "name": project.name,
            "description": project.description or "",
            "research_field": project.target_field or "",
        }
        if additional_instructions:
            project_dict["additional_instructions"] = additional_instructions

        # 4. Call LLM
        llm = get_llm_service(settings)
        outline_data = llm.generate_outline(project_dict, ideas_dicts, cards_dicts)

        # Build the draft text from generated content
        title = outline_data.get("title", "")
        abstract = outline_data.get("abstract", "")
        contributions = outline_data.get("contributions", [])
        outline_sections = outline_data.get("outline", [])

        draft_text = f"Title: {title}\n\nAbstract: {abstract}\n\nContributions:\n"
        draft_text += "\n".join(f"- {c}" for c in contributions)

        # 5. Run compliance check
        compliance_data = {
            "current_draft": draft_text,
            "outline": outline_sections,
        }
        compliance_result = run_compliance_check(compliance_data)
        compliance_status = compliance_result.get("status", "unchecked")
        compliance_details = compliance_result.get("violations", [])

        # 6. Upsert manuscript state
        manuscript = db.query(ManuscriptState).filter(ManuscriptState.project_id == project_id).first()
        if manuscript:
            manuscript.title = title
            manuscript.abstract = abstract
            manuscript.contributions = contributions
            manuscript.outline = outline_sections
            manuscript.current_draft = draft_text
            manuscript.compliance_status = compliance_status
            manuscript.compliance_details = compliance_details
            manuscript.method_version = manuscript.method_version + 1
        else:
            manuscript = ManuscriptState(
                project_id=project_id,
                title=title,
                abstract=abstract,
                contributions=contributions,
                outline=outline_sections,
                current_draft=draft_text,
                compliance_status=compliance_status,
                compliance_details=compliance_details,
                method_version=1,
                unresolved_issues=[],
            )
            db.add(manuscript)

        db.commit()
        db.refresh(manuscript)

        return manuscript
