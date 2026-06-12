from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class PaperCard(Base):
    __tablename__ = "paper_cards"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False, unique=True)
    research_problem = Column(Text, default="")
    method_summary = Column(Text, default="")
    novelty_points = Column(JSON, default=list)
    limitations = Column(JSON, default=list)
    datasets = Column(JSON, default=list)
    metrics = Column(JSON, default=list)
    baselines = Column(JSON, default=list)
    main_results = Column(JSON, default=list)
    reproducibility = Column(Text, default="")
    evidence_spans = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())

    paper = relationship("Paper", back_populates="paper_card")
    evidence_span_list = relationship("EvidenceSpan", back_populates="paper_card", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<PaperCard(id={self.id}, paper_id={self.paper_id})>"
