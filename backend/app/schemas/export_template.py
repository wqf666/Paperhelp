from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ExportTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    template_type: str
    description: str = ""
    file_path: str = ""
    section_mapping: dict = {}
    style_config: dict = {}
    is_builtin: bool = False
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
