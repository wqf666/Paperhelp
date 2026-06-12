from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ResultsAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    experiment_result_id: int
    summary: str = ""
    key_findings: list[str] = []
    comparison_table: list = []
    strengths: list[str] = []
    weaknesses: list[str] = []
    statistical_notes: list[str] = []
    recommendations: list[str] = []
    compliance_status: str = "unchecked"
    compliance_details: list = []
    created_at: Optional[datetime] = None
