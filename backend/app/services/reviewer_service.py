"""Service for simulating peer reviewers on a research project."""

import logging
from sqlalchemy.orm import Session

from app.config import settings
from app.models.paper import Paper
from app.models.paper_card import PaperCard
from app.models.project import Project
from app.models.research_idea import ResearchIdea
from app.models.method_version import MethodVersion
from app.models.experiment_result import ExperimentResult
from app.models.manuscript_state import ManuscriptState
from app.models.reviewer_simulation import ReviewerSimulation
from app.services.llm_service import get_llm_service

logger = logging.getLogger(__name__)


class ReviewerService:
    """Simulates peer review for a research project using LLM."""

    def simulate_reviewers(
        self,
        project_id: int,
        num_reviewers: int,
        db: Session,
    ) -> list[ReviewerSimulation]:
        """
        Simulate multiple reviewer perspectives for a project.

        1. Gather project context: paper cards, ideas, method versions,
           experiment results, and manuscript outline.
        2. Call LLM simulate_reviewer() for each reviewer role.
        3. Store ReviewerSimulation records.
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with id {project_id} not found")

        # Gather paper cards
        paper_ids = [p.id for p in db.query(Paper).filter(Paper.project_id == project_id).all()]
        paper_cards = (
            db.query(PaperCard).filter(PaperCard.paper_id.in_(paper_ids)).all() if paper_ids else []
        )
        cards_dicts = [
            {
                "paper_id": c.paper_id,
                "research_problem": c.research_problem,
                "method_summary": c.method_summary,
                "novelty_points": c.novelty_points if isinstance(c.novelty_points, list) else [],
                "limitations": c.limitations if isinstance(c.limitations, list) else [],
                "main_results": c.main_results if isinstance(c.main_results, list) else [],
            }
            for c in paper_cards
        ]

        # Gather ideas
        ideas = db.query(ResearchIdea).filter(ResearchIdea.project_id == project_id).all()
        ideas_dicts = [
            {
                "name": i.name,
                "research_gap": i.research_gap,
                "proposed_solution": i.proposed_solution,
                "expected_contributions": i.expected_contributions if isinstance(i.expected_contributions, list) else [],
                "novelty_score": i.novelty_score,
                "feasibility_score": i.feasibility_score,
            }
            for i in ideas
        ]

        # Gather method versions
        method_versions = (
            db.query(MethodVersion)
            .filter(MethodVersion.project_id == project_id)
            .all()
        )
        method_versions_dicts = [
            {
                "version_number": mv.version_number,
                "name": mv.name,
                "description": mv.description or "",
                "key_changes": mv.key_changes if isinstance(mv.key_changes, list) else [],
                "status": mv.status,
            }
            for mv in method_versions
        ]

        # Gather experiment results
        experiment_results = (
            db.query(ExperimentResult)
            .filter(ExperimentResult.project_id == project_id)
            .all()
        )
        experiment_results_dicts = [
            {
                "name": er.name,
                "experiment_type": er.experiment_type,
                "description": er.description or "",
                "status": er.status,
            }
            for er in experiment_results
        ]

        # Get manuscript outline
        manuscript = (
            db.query(ManuscriptState)
            .filter(ManuscriptState.project_id == project_id)
            .first()
        )
        manuscript_outline = {}
        if manuscript:
            manuscript_outline = {
                "title": manuscript.title or "",
                "abstract": manuscript.abstract or "",
                "contributions": manuscript.contributions if isinstance(manuscript.contributions, list) else [],
                "outline": manuscript.outline if isinstance(manuscript.outline, list) else [],
            }

        # Project context
        project_context = {
            "name": project.name,
            "description": project.description or "",
            "target_field": project.target_field or "",
            "target_venue": project.target_venue or "",
        }

        # Remove old simulations for this project (fresh run)
        db.query(ReviewerSimulation).filter(
            ReviewerSimulation.project_id == project_id
        ).delete()
        db.flush()

        llm = get_llm_service(settings)
        created_simulations: list[ReviewerSimulation] = []

        for reviewer_idx in range(num_reviewers):
            review_data = llm.simulate_reviewer(
                project_context=project_context,
                paper_cards=cards_dicts,
                ideas=ideas_dicts,
                method_versions=method_versions_dicts,
                experiment_results=experiment_results_dicts,
                manuscript_outline=manuscript_outline,
                reviewer_index=reviewer_idx,
            )

            # Determine role and expertise based on reviewer index
            role = review_data.get("reviewer_role", f"Reviewer {reviewer_idx + 1}")
            expertise = review_data.get("expertise_area", "")

            simulation = ReviewerSimulation(
                project_id=project_id,
                reviewer_role=role,
                expertise_area=expertise,
                overall_assessment=review_data.get("overall_assessment", ""),
                novelty_concerns=review_data.get("novelty_concerns", []),
                method_concerns=review_data.get("method_concerns", []),
                experiment_concerns=review_data.get("experiment_concerns", []),
                writing_concerns=review_data.get("writing_concerns", []),
                major_issues=review_data.get("major_issues", []),
                minor_issues=review_data.get("minor_issues", []),
                suggested_experiments=review_data.get("suggested_experiments", []),
                overall_score=float(review_data.get("overall_score", 0.0)),
                recommendation=review_data.get("recommendation", ""),
            )
            db.add(simulation)
            created_simulations.append(simulation)

        db.commit()
        for sim in created_simulations:
            db.refresh(sim)

        return created_simulations

    def list_simulations(self, project_id: int, db: Session) -> list[ReviewerSimulation]:
        """Return all reviewer simulations for a project."""
        return (
            db.query(ReviewerSimulation)
            .filter(ReviewerSimulation.project_id == project_id)
            .all()
        )
