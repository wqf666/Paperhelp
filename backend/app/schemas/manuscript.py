from datetime import datetime
from typing import List, Dict, Any, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.manuscript_section import ManuscriptSectionResponse


class OutlineGenerateRequest(BaseModel):
    additional_instructions: str = ""


class ManuscriptStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: Optional[str] = ""
    abstract: Optional[str] = ""
    contributions: list[str] = []
    outline: List[Dict[str, Any]] = []
    current_draft: Optional[str] = ""
    compliance_status: Optional[str] = "unchecked"
    compliance_details: List[Dict[str, Any]] = []
    method_version: int = 1
    active_method_version_id: Optional[int] = None
    export_status: Optional[str] = "none"
    template_id: Optional[int] = None
    sections: List[ManuscriptSectionResponse] = []
    unresolved_issues: list[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
