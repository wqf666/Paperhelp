from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class PaperChunk(Base):
    __tablename__ = "paper_chunks"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    section_title = Column(String(500), default="")
    content = Column(Text, nullable=False)
    start_page = Column(Integer, nullable=True)
    end_page = Column(Integer, nullable=True)
    chunk_type = Column(String(50), default="body")  # abstract/body/table/reference/figure_caption
    created_at = Column(DateTime, server_default=func.now())

    paper = relationship("Paper", back_populates="chunks")
    evidence_spans = relationship("EvidenceSpan", back_populates="chunk")

    def __repr__(self) -> str:
        return f"<PaperChunk(id={self.id}, paper_id={self.paper_id}, chunk_index={self.chunk_index})>"
