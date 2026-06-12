from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base


class ExportRecord(Base):
    __tablename__ = "export_records"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    manuscript_state_id = Column(Integer, ForeignKey("manuscript_states.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(Integer, ForeignKey("export_templates.id", ondelete="SET NULL"), nullable=True)
    export_type = Column(String(50), nullable=False)  # docx, latex, bibtex, cover_letter, response_letter
    file_path = Column(String(1000), default="")
    file_name = Column(String(255), default="")
    file_size = Column(Integer, default=0)
    status = Column(String(50), default="generating")  # generating/completed/failed
    error_message = Column(Text, default="")
    compilation_log = Column(Text, default="")
    metadata_ = Column("metadata", JSON, default=dict)  # export params snapshot
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="export_records")
    manuscript_state = relationship("ManuscriptState")
    template = relationship("ExportTemplate")
