from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from app.database import Base


class EvidenceSpan(Base):
    __tablename__ = "evidence_spans"

    id = Column(Integer, primary_key=True, index=True)
    paper_card_id = Column(Integer, ForeignKey("paper_cards.id", ondelete="CASCADE"), nullable=False)
    chunk_id = Column(Integer, ForeignKey("paper_chunks.id", ondelete="SET NULL"), nullable=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    claim_type = Column(String(50), nullable=False)  # novelty/limitation/method/result/dataset
    claim_text = Column(Text, nullable=False)
    source_page = Column(Integer, nullable=True)
    source_section = Column(String(500), default="")
    source_text_span = Column(Text, default="")
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())

    paper_card = relationship("PaperCard", back_populates="evidence_span_list")
    chunk = relationship("PaperChunk", back_populates="evidence_spans")
    paper = relationship("Paper")

    def __repr__(self) -> str:
        return f"<EvidenceSpan(id={self.id}, claim_type='{self.claim_type}')>"
