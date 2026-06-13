from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ExportRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    project_id: int
    manuscript_state_id: int
    template_id: Optional[int] = None
    export_type: str
    file_path: str = ""
    file_name: str = ""
    file_size: int = 0
    status: str = "generating"
    error_message: str = ""
    compilation_log: str = ""
    export_metadata: dict = Field(default_factory=dict, alias="metadata_")
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
