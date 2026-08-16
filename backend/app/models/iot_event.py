from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import enum
import datetime
import uuid


class IoTEventType(str, enum.Enum):
    DOCUMENT_CAPTURED = "DOCUMENT_CAPTURED"
    UPLOAD_STARTED = "UPLOAD_STARTED"
    UPLOAD_COMPLETED = "UPLOAD_COMPLETED"
    PROCESSING_STARTED = "PROCESSING_STARTED"
    PROCESSING_COMPLETED = "PROCESSING_COMPLETED"
    PROCESSING_FAILED = "PROCESSING_FAILED"
    HEARTBEAT = "HEARTBEAT"
    FIRMWARE_CHECK = "FIRMWARE_CHECK"


class IoTEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}", description="Unique event identifier")
    device_id: str = Field(..., description="Device that produced the telemetry or document event")
    event_type: IoTEventType = Field(..., description="Type of event")
    timestamp: str = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(),
        description="ISO 8601 UTC timestamp"
    )
    job_id: Optional[str] = Field(default=None, description="Associated PDFBolt document processing job ID")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Event telemetry parameters, file metrics, or error payload")
