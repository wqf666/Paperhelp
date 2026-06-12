import enum

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy.orm import relationship

from app.database import Base


class PaperStatus(str, enum.Enum):
    uploaded = "uploaded"
    parsing = "parsing"
    parsed = "parsed"
    analyzing = "analyzing"
    analyzed = "analyzed"
    error = "error"


class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    authors = Column(Text, default="")
    year = Column(Integer, nullable=True)
    venue = Column(String(255), default="")
    doi = Column(String(255), default="")
    abstract = Column(Text, default="")
    file_path = Column(String(1000), default="")
    status = Column(SAEnum(PaperStatus), default=PaperStatus.uploaded, nullable=False)
    chunk_count = Column(Integer, default=0)
    pdf_parse_status = Column(String(50), default="none")  # none/parsing/parsed/error
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="papers")
    paper_card = relationship("PaperCard", back_populates="paper", uselist=False, cascade="all, delete-orphan")
    chunks = relationship("PaperChunk", back_populates="paper", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Paper(id={self.id}, title='{self.title[:50]}...', status={self.status})>"
