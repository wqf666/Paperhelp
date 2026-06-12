"""Service for checking idea differentiation against existing literature."""

import logging
from sqlalchemy.orm import Session

from app.config import settings
from app.models.paper import Paper
from app.models.paper_card import PaperCard
from app.models.research_idea import ResearchIdea
from app.services.llm_service import get_llm_service

logger = logging.getLogger(__name__)


class DifferentiationService:
    """Checks whether a research idea is sufficiently differentiated from existing papers."""

    def check_differentiation(self, idea_id: int, db: Session) -> dict:
        """
        Check idea differentiation:
        1. Get the ResearchIdea record.
        2. Gather all PaperCards from the same project.
        3. Call LLM check_differentiation().
        4. Store the result in idea.differentiation_check JSON field.
        5. Return the differentiation result.
        """
        idea = db.query(ResearchIdea).filter(ResearchIdea.id == idea_id).first()
        if not idea:
            raise ValueError(f"ResearchIdea with id {idea_id} not found")

        # Gather all paper cards from the same project
        paper_ids = [
            p.id for p in db.query(Paper).filter(Paper.project_id == idea.project_id).all()
        ]
        paper_cards = (
            db.query(PaperCard).filter(PaperCard.paper_id.in_(paper_ids)).all()
            if paper_ids
            else []
        )
        cards_dicts = [
            {
                "paper_id": c.paper_id,
                "research_problem": c.research_problem,
                "method_summary": c.method_summary,
                "novelty_points": c.novelty_points if isinstance(c.novelty_points, list) else [],
                "datasets": c.datasets if isinstance(c.datasets, list) else [],
                "main_results": c.main_results if isinstance(c.main_results, list) else [],
            }
            for c in paper_cards
        ]

        # Build idea dict for the LLM
        idea_dict = {
            "name": idea.name,
            "research_gap": idea.research_gap,
            "proposed_solution": idea.proposed_solution,
            "expected_contributions": idea.expected_contributions if isinstance(idea.expected_contributions, list) else [],
            "novelty_score": idea.novelty_score,
            "feasibility_score": idea.feasibility_score,
            "risk_level": idea.risk_level,
        }

        llm = get_llm_service(settings)
        result = llm.check_differentiation(idea_dict, cards_dicts)

        # Store the result on the idea
        idea.differentiation_check = result
        db.commit()
        db.refresh(idea)

        return result
