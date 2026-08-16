from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import datetime
import enum


class DeviceStatus(str, enum.Enum):
    ACTIVE = "active"
    OFFLINE = "offline"
    PROVISIONING = "provisioning"
    DECOMMISSIONED = "decommissioned"
    ERROR = "error"


class DeviceType(str, enum.Enum):
    SCANNER = "scanner"
    CAMERA = "camera"
    PRINTER_MFP = "printer_mfp"
    EDGE_GATEWAY = "edge_gateway"
    KIOSK = "kiosk"
    MOBILE_TERMINAL = "mobile_terminal"


class DeviceRegistration(BaseModel):
    device_id: str = Field(..., description="Unique physical or logical identifier (e.g. MAC / Serial Number / UUID)")
    device_type: DeviceType = Field(default=DeviceType.SCANNER, description="Device classification")
    firmware_version: str = Field(default="1.0.0", description="Installed firmware revision")
    owner_id: Optional[str] = Field(default=None, description="Tenant or organization identifier")
    capabilities: List[str] = Field(
        default=["scan", "compress", "ocr", "upload"],
        description="Supported device edge operations"
    )
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Hardware specs and configuration")


class DeviceResponse(BaseModel):
    device_id: str
    device_type: DeviceType
    firmware_version: str
    status: DeviceStatus
    created_at: str
    last_seen: str
    owner_id: Optional[str]
    capabilities: List[str]
    metadata: Dict[str, Any]
    api_token_preview: Optional[str] = None  # Preview of generated authentication token
