from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class ResearchIdea(Base):
    __tablename__ = "research_ideas"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(500), nullable=False)
    research_gap = Column(Text, default="")
    proposed_solution = Column(Text, default="")
    related_papers = Column(JSON, default=list)
    expected_contributions = Column(JSON, default=list)
    novelty_score = Column(Float, default=0.0)
    feasibility_score = Column(Float, default=0.0)
    risk_level = Column(String(50), default="medium")
    experiment_plan_summary = Column(Text, default="")
    differentiation_check = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="research_ideas")
    experiment_plan = relationship(
        "ExperimentPlan", back_populates="idea", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ResearchIdea(id={self.id}, name='{self.name[:50]}...')>"
