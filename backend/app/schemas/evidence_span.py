from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class EvidenceSpanCreate(BaseModel):
    claim_type: str
    claim_text: str
    source_page: Optional[int] = None
    source_section: str = ""
    source_text_span: str = ""
    confidence: float = 0.0
    chunk_id: Optional[int] = None


class EvidenceSpanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    paper_card_id: int
    chunk_id: Optional[int] = None
    paper_id: int
    claim_type: str
    claim_text: str
    source_page: Optional[int] = None
    source_section: str = ""
    source_text_span: str = ""
    confidence: float = 0.0
    created_at: Optional[datetime] = None
