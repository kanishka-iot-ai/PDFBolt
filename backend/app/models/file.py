from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import Optional


class FileMetadata(BaseModel):
    file_id         : str
    original_name   : str
    sanitized_name  : str
    mime_type       : str
    size_bytes      : int
    page_count      : Optional[int] = None
    path            : Optional[str] = None
    created_at      : datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
