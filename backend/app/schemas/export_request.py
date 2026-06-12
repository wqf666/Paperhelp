from typing import Optional

from pydantic import BaseModel


class ExportRequest(BaseModel):
    template_id: Optional[int] = None
    include_ai_disclosure: bool = True
    include_cover_letter: bool = False
