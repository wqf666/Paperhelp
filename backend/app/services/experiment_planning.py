"""Service for generating experiment plans from research ideas."""

from sqlalchemy.orm import Session

from app.config import settings
from app.models.experiment_plan import ExperimentPlan
from app.models.paper import Paper
from app.models.paper_card import PaperCard
from app.models.research_idea import ResearchIdea
from app.services.llm_service import get_llm_service


class ExperimentPlanningService:
    """Generates and persists detailed experiment plans for research ideas."""

    def generate_plan(self, idea_id: int, db: Session) -> ExperimentPlan:
        """
        Experiment plan pipeline:
        1. Retrieve the research idea.
        2. Gather related paper cards (from the same project).
        3. Call the LLM to produce an experiment plan.
        4. Persist the plan (upsert if one already exists for this idea).
        5. Return the created ExperimentPlan.
        """
        # 1. Fetch idea
        idea = db.query(ResearchIdea).filter(ResearchIdea.id == idea_id).first()
        if not idea:
            raise ValueError(f"Research idea with id {idea_id} not found")

        # 2. Gather related paper cards from the same project
        paper_ids = [p.id for p in db.query(Paper).filter(Paper.project_id == idea.project_id).all()]
        related_cards = (
            db.query(PaperCard).filter(PaperCard.paper_id.in_(paper_ids)).all() if paper_ids else []
        )
        cards_dicts = [
            {
                "research_problem": c.research_problem,
                "method_summary": c.method_summary,
                "novelty_points": c.novelty_points if isinstance(c.novelty_points, list) else [],
                "limitations": c.limitations if isinstance(c.limitations, list) else [],
            }
            for c in related_cards
        ]

        idea_dict = {
            "name": idea.name,
            "research_gap": idea.research_gap,
            "proposed_solution": idea.proposed_solution,
            "expected_contributions": idea.expected_contributions if isinstance(idea.expected_contributions, list) else [],
        }

        # 3. Call LLM
        llm = get_llm_service(settings)
        plan_data = llm.generate_experiment_plan(idea_dict, cards_dicts)

        # 4. Upsert experiment plan
        existing = db.query(ExperimentPlan).filter(ExperimentPlan.idea_id == idea_id).first()
        if existing:
            db.delete(existing)
            db.flush()

        plan = ExperimentPlan(
            idea_id=idea_id,
            main_experiments=plan_data.get("main_experiments", []),
            ablation_studies=plan_data.get("ablation_studies", []),
            robustness_tests=plan_data.get("robustness_tests", []),
            efficiency_tests=plan_data.get("efficiency_tests", []),
            datasets=plan_data.get("datasets", []),
            metrics=plan_data.get("metrics", []),
            baselines=plan_data.get("baselines", []),
            risk_and_fallbacks=plan_data.get("risk_and_fallbacks", []),
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)

        return plan
