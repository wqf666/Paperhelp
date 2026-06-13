"""Service for generating research ideas from analysed paper cards within a project."""

from sqlalchemy.orm import Session

from app.config import settings
from app.models.paper import Paper
from app.models.paper_card import PaperCard
from app.models.project import Project
from app.models.research_idea import ResearchIdea
from app.services.llm_service import get_llm_service


class IdeaGenerationService:
    """Generates and persists research ideas for a given project."""

    def generate_ideas(
        self,
        project_id: int,
        research_field: str,
        additional_context: str,
        db: Session,
    ) -> list[ResearchIdea]:
        """
        Idea generation pipeline:
        1. Validate the project exists.
        2. Collect all paper cards belonging to papers in the project.
        3. Call the LLM to produce research ideas.
        4. Persist each idea and return them.
        """
        # 1. Validate project
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with id {project_id} not found")

        # 2. Collect paper cards — require at least one analyzed paper
        papers = db.query(Paper).filter(Paper.project_id == project_id).all()
        paper_ids = [p.id for p in papers]

        if not paper_ids:
            raise ValueError("请先在论文库中上传论文，再生成创新方向。")

        paper_cards = db.query(PaperCard).filter(PaperCard.paper_id.in_(paper_ids)).all()

        if not paper_cards:
            raise ValueError(
                "论文库中已有论文但尚未分析。请先对论文进行 AI 分析后再生成创新方向。"
            )

        cards_dicts = [
            {
                "paper_id": c.paper_id,
                "research_problem": c.research_problem,
                "method_summary": c.method_summary,
                "novelty_points": c.novelty_points if isinstance(c.novelty_points, list) else [],
                "limitations": c.limitations if isinstance(c.limitations, list) else [],
                "datasets": c.datasets if isinstance(c.datasets, list) else [],
                "metrics": c.metrics if isinstance(c.metrics, list) else [],
                "baselines": c.baselines if isinstance(c.baselines, list) else [],
                "main_results": c.main_results if isinstance(c.main_results, list) else [],
            }
            for c in paper_cards
        ]

        effective_field = research_field or project.target_field or ""

        # 3. Call LLM
        llm = get_llm_service(settings)
        ideas_data = llm.generate_ideas(cards_dicts, effective_field, additional_context or "")

        # 4. Persist ideas
        created_ideas: list[ResearchIdea] = []
        for idea_data in ideas_data:
            idea = ResearchIdea(
                project_id=project_id,
                name=idea_data.get("name", "Untitled Idea"),
                research_gap=idea_data.get("research_gap", ""),
                proposed_solution=idea_data.get("proposed_solution", ""),
                related_papers=idea_data.get("related_papers", []),
                expected_contributions=idea_data.get("expected_contributions", []),
                novelty_score=float(idea_data.get("novelty_score", 0.0)),
                feasibility_score=float(idea_data.get("feasibility_score", 0.0)),
                risk_level=idea_data.get("risk_level", "medium"),
                experiment_plan_summary=idea_data.get("experiment_plan_summary", ""),
            )
            db.add(idea)
            created_ideas.append(idea)

        db.commit()
        for idea in created_ideas:
            db.refresh(idea)

        return created_ideas
