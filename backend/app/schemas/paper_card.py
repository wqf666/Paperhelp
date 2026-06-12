from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.evidence_span import EvidenceSpanResponse


class PaperCardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    paper_id: int
    research_problem: Optional[str] = ""
    method_summary: Optional[str] = ""
    novelty_points: list[str] = []
    limitations: list[str] = []
    datasets: list[str] = []
    metrics: list[str] = []
    baselines: list[str] = []
    main_results: list[str] = []
    reproducibility: Optional[str] = ""
    evidence_spans: list[str] = []
    evidence_span_list: list[EvidenceSpanResponse] = []
    created_at: Optional[datetime] = None
