from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    target_field: str = ""
    target_venue: str = ""


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_field: Optional[str] = None
    target_venue: Optional[str] = None


class PaperBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    status: str
    created_at: Optional[datetime] = None


class IdeaBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    novelty_score: Optional[float] = 0.0
    feasibility_score: Optional[float] = 0.0


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = ""
    target_field: Optional[str] = ""
    target_venue: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    paper_count: int = 0
    idea_count: int = 0
    method_version_count: int = 0
    experiment_count: int = 0
    manuscript_count: int = 0
    papers: List[PaperBrief] = []
    research_ideas: List[IdeaBrief] = []
