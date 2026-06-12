from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class IdeaGenerateRequest(BaseModel):
    research_field: str = ""
    additional_context: str = ""


class ResearchIdeaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    name: str
    research_gap: Optional[str] = ""
    proposed_solution: Optional[str] = ""
    related_papers: list[int] = []
    expected_contributions: list[str] = []
    novelty_score: Optional[float] = 0.0
    feasibility_score: Optional[float] = 0.0
    risk_level: Optional[str] = "medium"
    experiment_plan_summary: Optional[str] = ""
    created_at: Optional[datetime] = None
