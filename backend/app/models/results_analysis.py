from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class ResultsAnalysis(Base):
    __tablename__ = "results_analyses"

    id = Column(Integer, primary_key=True, index=True)
    experiment_result_id = Column(
        Integer, ForeignKey("experiment_results.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    summary = Column(Text, default="")
    key_findings = Column(JSON, default=list)
    comparison_table = Column(JSON, default=list)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    statistical_notes = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    compliance_status = Column(String(50), default="unchecked")
    compliance_details = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())

    experiment_result = relationship("ExperimentResult", back_populates="results_analysis")

    def __repr__(self) -> str:
        return f"<ResultsAnalysis(id={self.id}, experiment_result_id={self.experiment_result_id})>"
