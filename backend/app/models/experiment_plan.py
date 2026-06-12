from sqlalchemy import Column, Integer, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class ExperimentPlan(Base):
    __tablename__ = "experiment_plans"

    id = Column(Integer, primary_key=True, index=True)
    idea_id = Column(Integer, ForeignKey("research_ideas.id", ondelete="CASCADE"), nullable=False, unique=True)
    main_experiments = Column(JSON, default=list)
    ablation_studies = Column(JSON, default=list)
    robustness_tests = Column(JSON, default=list)
    efficiency_tests = Column(JSON, default=list)
    datasets = Column(JSON, default=list)
    metrics = Column(JSON, default=list)
    baselines = Column(JSON, default=list)
    risk_and_fallbacks = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())

    idea = relationship("ResearchIdea", back_populates="experiment_plan")

    def __repr__(self) -> str:
        return f"<ExperimentPlan(id={self.id}, idea_id={self.idea_id})>"
