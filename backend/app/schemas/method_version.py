from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MethodVersionCreate(BaseModel):
    name: str
    description: str = ""
    key_changes: list[str] = []
    rationale: str = ""
    based_on_idea_id: Optional[int] = None
    parent_version_id: Optional[int] = None


class MethodVersionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    key_changes: Optional[list[str]] = None
    rationale: Optional[str] = None
    status: Optional[str] = None


class MethodVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    version_number: int
    name: str
    description: str = ""
    key_changes: list[str] = []
    rationale: str = ""
    based_on_idea_id: Optional[int] = None
    parent_version_id: Optional[int] = None
    status: str = "draft"
    created_at: Optional[datetime] = None
