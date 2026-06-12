from typing import Optional

from pydantic import BaseModel


class ResponseLetterRequest(BaseModel):
    additional_context: str = ""
