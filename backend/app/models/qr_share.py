from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum


class QRShareStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
    DELETED = "DELETED"


class QRShareDuration(int, Enum):
    FIFTEEN_MINUTES = 900
    ONE_HOUR = 3600
    TWENTY_FOUR_HOURS = 86400
    SEVEN_DAYS = 604800
    THIRTY_DAYS = 2592000


class QRShareResponse(BaseModel):
    share_id: str
    filename: str
    file_size_bytes: int
    created_at: str
    expires_at: str
    status: QRShareStatus
    share_url: str
    download_url: Optional[str] = None
    revocation_token: Optional[str] = None
    one_time_scan: bool = False
    require_pin: bool = False
    is_expired: bool = False
    duration_seconds: int = 86400
    retention_notice: str = "This file is stored temporarily and will be automatically deleted when the share expires."


class QRShareRevokeRequest(BaseModel):
    revocation_token: str
