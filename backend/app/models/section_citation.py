from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SectionCitation(Base):
    __tablename__ = "section_citations"

    id = Column(Integer, primary_key=True, index=True)
    manuscript_section_id = Column(Integer, ForeignKey("manuscript_sections.id", ondelete="CASCADE"), nullable=False)
    citation_id = Column(Integer, ForeignKey("citations.id", ondelete="CASCADE"), nullable=False)
    citation_context = Column(String(500), default="")
    sort_order = Column(Integer, default=0)

    manuscript_section = relationship("ManuscriptSection", back_populates="section_citations")
    citation = relationship("Citation", back_populates="section_citations")
