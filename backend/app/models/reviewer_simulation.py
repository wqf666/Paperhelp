from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class ReviewerSimulation(Base):
    __tablename__ = "reviewer_simulations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    reviewer_role = Column(String(100), default="Reviewer 1")
    expertise_area = Column(String(255), default="")
    overall_assessment = Column(Text, default="")
    novelty_concerns = Column(JSON, default=list)
    method_concerns = Column(JSON, default=list)
    experiment_concerns = Column(JSON, default=list)
    writing_concerns = Column(JSON, default=list)
    major_issues = Column(JSON, default=list)
    minor_issues = Column(JSON, default=list)
    suggested_experiments = Column(JSON, default=list)
    overall_score = Column(Float, default=0.0)
    recommendation = Column(String(50), default="")  # accept/minor_revision/major_revision/reject
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="reviewer_simulations")

    def __repr__(self) -> str:
        return f"<ReviewerSimulation(id={self.id}, reviewer_role='{self.reviewer_role}')>"
