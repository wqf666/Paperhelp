from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class MethodVersion(Base):
    __tablename__ = "method_versions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    name = Column(String(500), nullable=False)
    description = Column(Text, default="")
    key_changes = Column(JSON, default=list)
    rationale = Column(Text, default="")
    based_on_idea_id = Column(Integer, ForeignKey("research_ideas.id", ondelete="SET NULL"), nullable=True)
    parent_version_id = Column(Integer, ForeignKey("method_versions.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="draft")  # draft/active/archived
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="method_versions")
    based_on_idea = relationship("ResearchIdea")
    parent_version = relationship("MethodVersion", remote_side="MethodVersion.id")

    def __repr__(self) -> str:
        return f"<MethodVersion(id={self.id}, version_number={self.version_number}, status='{self.status}')>"
