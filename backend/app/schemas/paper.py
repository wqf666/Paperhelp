from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict

from app.models.paper import PaperStatus


class PaperCreate(BaseModel):
    title: str
    authors: str = ""
    year: Optional[int] = None
    venue: str = ""
    doi: str = ""
    abstract: str = ""


class PaperResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    authors: Optional[str] = ""
    year: Optional[int] = None
    venue: Optional[str] = ""
    doi: Optional[str] = ""
    abstract: Optional[str] = ""
    file_path: Optional[str] = ""
    status: PaperStatus
    chunk_count: int = 0
    pdf_parse_status: str = "none"
    created_at: Optional[datetime] = None
