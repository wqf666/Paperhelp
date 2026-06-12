from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ReviewerSimulateRequest(BaseModel):
    num_reviewers: int = 3


class ReviewerSimulationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    reviewer_role: str = "Reviewer 1"
    expertise_area: str = ""
    overall_assessment: str = ""
    novelty_concerns: list = []
    method_concerns: list = []
    experiment_concerns: list = []
    writing_concerns: list = []
    major_issues: list = []
    minor_issues: list = []
    suggested_experiments: list = []
    overall_score: float = 0.0
    recommendation: str = ""
    created_at: Optional[datetime] = None
