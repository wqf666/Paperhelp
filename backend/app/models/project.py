from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    target_field = Column(String(255), default="")
    target_venue = Column(String(255), default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    papers = relationship("Paper", back_populates="project", cascade="all, delete-orphan")
    research_ideas = relationship("ResearchIdea", back_populates="project", cascade="all, delete-orphan")
    manuscript_states = relationship(
        "ManuscriptState", back_populates="project", cascade="all, delete-orphan"
    )
    method_versions = relationship("MethodVersion", back_populates="project", cascade="all, delete-orphan")
    experiment_results = relationship("ExperimentResult", back_populates="project", cascade="all, delete-orphan")
    reviewer_simulations = relationship("ReviewerSimulation", back_populates="project", cascade="all, delete-orphan")
    citations = relationship("Citation", back_populates="project", cascade="all, delete-orphan")
    export_records = relationship("ExportRecord", back_populates="project", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}')>"
