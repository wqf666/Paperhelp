from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class ManuscriptSection(Base):
    __tablename__ = "manuscript_sections"

    id = Column(Integer, primary_key=True, index=True)
    manuscript_state_id = Column(Integer, ForeignKey("manuscript_states.id", ondelete="CASCADE"), nullable=False)
    section_key = Column(String(100), nullable=False)
    title = Column(String(500), default="")
    content = Column(Text, default="")
    method_version_id = Column(Integer, ForeignKey("method_versions.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="draft")  # draft/review/final
    sort_order = Column(Integer, default=0)
    figure_refs = Column(JSON, default=list)  # list of figure references
    table_refs = Column(JSON, default=list)  # list of table references
    equation_refs = Column(JSON, default=list)  # list of equation references
    citation_keys = Column(JSON, default=list)  # list of citation keys used in this section
    generated_content = Column(Text, default="")  # LLM generated content draft
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    manuscript_state = relationship("ManuscriptState", back_populates="sections")
    method_version = relationship("MethodVersion")
    section_citations = relationship("SectionCitation", back_populates="manuscript_section", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ManuscriptSection(id={self.id}, section_key='{self.section_key}', status='{self.status}')>"
