from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, func
from sqlalchemy.orm import relationship
from app.database import Base


class Citation(Base):
    __tablename__ = "citations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    cite_key = Column(String(100), nullable=False)  # BibTeX key e.g. "smith2023nlp"
    entry_type = Column(String(50), default="article")  # article, inproceedings, book, etc.
    title = Column(String(500), default="")
    authors = Column(Text, default="")  # "Author1 and Author2"
    year = Column(Integer, nullable=True)
    venue = Column(String(255), default="")
    doi = Column(String(255), default="")
    url = Column(String(1000), default="")
    abstract = Column(Text, default="")
    raw_bibtex = Column(Text, default="")
    extra_fields = Column(JSON, default=dict)  # volume, pages, etc.
    source = Column(String(50), default="manual")  # manual/imported/from_paper
    linked_paper_id = Column(Integer, ForeignKey("papers.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="citations")
    linked_paper = relationship("Paper")
    section_citations = relationship("SectionCitation", back_populates="citation", cascade="all, delete-orphan")
