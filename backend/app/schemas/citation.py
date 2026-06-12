from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CitationCreate(BaseModel):
    cite_key: str
    entry_type: str = "article"
    title: str = ""
    authors: str = ""
    year: Optional[int] = None
    venue: str = ""
    doi: str = ""
    url: str = ""
    abstract: str = ""
    raw_bibtex: str = ""
    extra_fields: dict = {}
    source: str = "manual"
    linked_paper_id: Optional[int] = None


class CitationUpdate(BaseModel):
    cite_key: Optional[str] = None
    entry_type: Optional[str] = None
    title: Optional[str] = None
    authors: Optional[str] = None
    year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    abstract: Optional[str] = None
    extra_fields: Optional[dict] = None
    linked_paper_id: Optional[int] = None


class CitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    cite_key: str
    entry_type: str = "article"
    title: str = ""
    authors: str = ""
    year: Optional[int] = None
    venue: str = ""
    doi: str = ""
    url: str = ""
    abstract: str = ""
    raw_bibtex: str = ""
    extra_fields: dict = {}
    source: str = "manual"
    linked_paper_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
