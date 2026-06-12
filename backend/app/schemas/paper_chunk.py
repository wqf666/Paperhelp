from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PaperChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    paper_id: int
    chunk_index: int
    section_title: str = ""
    content: str
    start_page: Optional[int] = None
    end_page: Optional[int] = None
    chunk_type: str = "body"
    created_at: Optional[datetime] = None
