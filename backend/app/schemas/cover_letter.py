from typing import Optional

from pydantic import BaseModel


class CoverLetterRequest(BaseModel):
    recipient_name: str = "Editor"
    recipient_title: str = "Editor-in-Chief"
    journal_or_conference: str = ""
    additional_notes: str = ""
