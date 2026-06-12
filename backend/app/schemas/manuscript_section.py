from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ManuscriptSectionCreate(BaseModel):
    section_key: str
    title: str = ""
    content: str = ""
    sort_order: int = 0
    method_version_id: Optional[int] = None


class ManuscriptSectionUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None
    method_version_id: Optional[int] = None


class SectionCitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    manuscript_section_id: int
    citation_id: int
    citation_context: str = ""
    sort_order: int = 0


class ManuscriptSectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    manuscript_state_id: int
    section_key: str
    title: str = ""
    content: str = ""
    method_version_id: Optional[int] = None
    status: str = "draft"
    sort_order: int = 0
    figure_refs: list = []
    table_refs: list = []
    equation_refs: list = []
    citation_keys: list = []
    generated_content: str = ""
    section_citations: list = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
