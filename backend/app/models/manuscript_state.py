from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class ManuscriptState(Base):
    __tablename__ = "manuscript_states"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), default="")
    abstract = Column(Text, default="")
    contributions = Column(JSON, default=list)
    outline = Column(JSON, default=list)
    current_draft = Column(Text, default="")
    compliance_status = Column(String(50), default="unchecked")
    compliance_details = Column(JSON, default=list)
    method_version = Column(Integer, default=1, nullable=False)
    unresolved_issues = Column(JSON, default=list)
    active_method_version_id = Column(Integer, ForeignKey("method_versions.id", ondelete="SET NULL"), nullable=True)
    export_status = Column(String(50), default="none")  # none/generating/completed/failed
    template_id = Column(Integer, ForeignKey("export_templates.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="manuscript_states")
    active_method_version = relationship("MethodVersion")
    sections = relationship(
        "ManuscriptSection", back_populates="manuscript_state", cascade="all, delete-orphan",
        order_by="ManuscriptSection.sort_order"
    )

    def __repr__(self) -> str:
        return f"<ManuscriptState(id={self.id}, project_id={self.project_id})>"
