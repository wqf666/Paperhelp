from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class ExperimentResult(Base):
    __tablename__ = "experiment_results"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    method_version_id = Column(Integer, ForeignKey("method_versions.id", ondelete="CASCADE"), nullable=False)
    experiment_plan_id = Column(Integer, ForeignKey("experiment_plans.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(500), nullable=False)
    description = Column(Text, default="")
    experiment_type = Column(String(50), default="main")  # main/ablation/robustness/efficiency
    raw_data = Column(JSON, default=list)
    file_path = Column(String(1000), default="")
    upload_format = Column(String(50), default="")
    status = Column(String(50), default="uploaded")  # uploaded/parsed/analyzed/error
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="experiment_results")
    method_version = relationship("MethodVersion")
    experiment_plan = relationship("ExperimentPlan")
    results_analysis = relationship(
        "ResultsAnalysis", back_populates="experiment_result", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ExperimentResult(id={self.id}, name='{self.name[:50]}', status='{self.status}')>"
