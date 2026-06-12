from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ExperimentResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    method_version_id: int
    experiment_plan_id: Optional[int] = None
    name: str
    description: str = ""
    experiment_type: str = "main"
    raw_data: list = []
    file_path: str = ""
    upload_format: str = ""
    status: str = "uploaded"
    created_at: Optional[datetime] = None
