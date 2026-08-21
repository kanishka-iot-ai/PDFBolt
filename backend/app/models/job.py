from enum import Enum
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from pathlib import Path


class JobStatus(str, Enum):
    QUEUED      = "QUEUED"
    PROCESSING  = "PROCESSING"
    VALIDATING   = "VALIDATING"
    COMPLETED   = "COMPLETED"
    FAILED      = "FAILED"
    EXPIRED     = "EXPIRED"
    CANCELLED   = "CANCELLED"


class Job(BaseModel):
    job_id          : str
    status          : JobStatus = JobStatus.QUEUED
    operation       : str
    created_at      : datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at      : Optional[datetime] = None
    completed_at    : Optional[datetime] = None
    expires_at      : datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(minutes=15))
    input_size      : Optional[int] = None
    output_size     : Optional[int] = None
    page_count_in   : Optional[int] = None
    page_count_out  : Optional[int] = None
    error_code      : Optional[str] = None
    error_message   : Optional[str] = None
    download_token  : Optional[str] = None
    output_path     : Optional[str] = None
    output_filename : Optional[str] = None
    metrics         : Dict[str, Any] = Field(default_factory=dict)
    options         : Dict[str, Any] = Field(default_factory=dict)


class JobResult(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    job_id      : str
    status      : JobStatus = JobStatus.COMPLETED
    output_path : Path
    duration_s  : float
    output_size : Optional[int] = None
    page_count  : Optional[int] = None
    metrics     : Dict[str, Any] = Field(default_factory=dict)
