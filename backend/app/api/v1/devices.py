import os
import uuid
import datetime
import hashlib
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form, Depends, status
from backend.app.models.device import DeviceRegistration, DeviceResponse, DeviceStatus, DeviceType
from backend.app.models.iot_event import IoTEvent, IoTEventType
from backend.app.models.schemas import JobResponse, JobStatus, OperationType
from backend.app.services.job_manager import job_manager
from backend.app.services.storage_provider import get_storage_provider
from backend.app.validators.input_validator import InputValidator
from backend.app.config import settings

router = APIRouter(prefix="/devices", tags=["IoT & Edge Devices"])

# In-memory device store (Production: Cloud SQL / Spanner / DynamoDB)
DEVICE_REGISTRY: Dict[str, Dict[str, Any]] = {}
DEVICE_TOKENS: Dict[str, str] = {}  # device_id -> hashed_token


def _require_admin_auth(x_admin_token: Optional[str] = Header(None)) -> bool:
    configured = settings.API_ADMIN_KEY.strip()
    if not configured:
        if settings.APP_ENV.lower() == "production":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Device management API is not configured."
            )
        return True
    if not x_admin_token or x_admin_token != configured:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid device management credentials."
        )
    return True


def _generate_device_token(device_id: str) -> str:
    raw_token = f"pdfbolt_dev_{uuid.uuid4().hex}"
    hashed = hashlib.sha256(raw_token.encode()).hexdigest()
    DEVICE_TOKENS[device_id] = hashed
    return raw_token


def _verify_device_auth(device_id: str, x_device_token: Optional[str] = Header(None)) -> bool:
    if device_id not in DEVICE_REGISTRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' is not registered."
        )
    
    # If token exists, verify SHA-256 match
    if device_id in DEVICE_TOKENS:
        if not x_device_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing X-Device-Token authorization header."
            )
        hashed_input = hashlib.sha256(x_device_token.encode()).hexdigest()
        if hashed_input != DEVICE_TOKENS[device_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid device authorization credentials."
            )
    return True


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def register_device(payload: DeviceRegistration, _: bool = Depends(_require_admin_auth)):
    """
    Provisions a new IoT scanner, camera terminal, or edge hardware unit.
    Generates a unique cryptographic device authentication token.
    """
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    raw_token = _generate_device_token(payload.device_id)

    record = {
        "device_id": payload.device_id,
        "device_type": payload.device_type,
        "firmware_version": payload.firmware_version,
        "status": DeviceStatus.ACTIVE,
        "created_at": now,
        "last_seen": now,
        "owner_id": payload.owner_id,
        "capabilities": payload.capabilities,
        "metadata": payload.metadata
    }

    DEVICE_REGISTRY[payload.device_id] = record

    response_data = dict(record)
    response_data["api_token_preview"] = raw_token  # Returned once upon registration
    return response_data


@router.get("", response_model=List[DeviceResponse])
def list_devices(_: bool = Depends(_require_admin_auth)):
    """Lists all registered IoT scanning and document hardware units."""
    return list(DEVICE_REGISTRY.values())


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: str, _: bool = Depends(_require_admin_auth)):
    """Retrieves operational telemetry and registration profile for a specific IoT device."""
    if device_id not in DEVICE_REGISTRY:
        raise HTTPException(status_code=404, detail="Device not found.")
    return DEVICE_REGISTRY[device_id]


@router.get("/{device_id}/status")
def get_device_status(device_id: str, x_device_token: Optional[str] = Header(None)):
    """Lightweight health check and heartbeat ping for IoT edge firmware."""
    _verify_device_auth(device_id, x_device_token)
    
    DEVICE_REGISTRY[device_id]["last_seen"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return {
        "device_id": device_id,
        "status": DEVICE_REGISTRY[device_id]["status"],
        "server_time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "ready": True
    }


@router.post("/{device_id}/jobs", response_model=JobResponse)
async def submit_device_job(
    device_id: str,
    file: UploadFile = File(...),
    operation: OperationType = Form(...),
    settings: Optional[str] = Form(None),
    x_device_token: Optional[str] = Header(None)
):
    """
    Accepts raw scanned document streams directly from authenticated IoT devices.
    Creates an asynchronous PDFBolt processing job.
    """
    _verify_device_auth(device_id, x_device_token)
    
    # Update last seen
    DEVICE_REGISTRY[device_id]["last_seen"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    content = await file.read()
    InputValidator.validate_file_size(content)

    import json
    parsed_settings = {}
    if settings:
        try:
            parsed_settings = json.loads(settings)
        except Exception:
            pass

    # Tag job with device provenance
    parsed_settings["origin"] = "iot_device"
    parsed_settings["device_id"] = device_id

    job_id = job_manager.create_job(operation, parsed_settings)
    clean_name = file.filename or "device_scan.pdf"
    return job_manager.execute_job_sync(job_id, content, clean_name)


@router.post("/{device_id}/events", response_model=Dict[str, Any])
def ingest_device_event(
    device_id: str,
    event: IoTEvent,
    x_device_token: Optional[str] = Header(None)
):
    """
    Ingests structured MQTT / PubSub telemetry events emitted by edge scanners.
    Events: DOCUMENT_CAPTURED, UPLOAD_STARTED, UPLOAD_COMPLETED, HEARTBEAT.
    """
    _verify_device_auth(device_id, x_device_token)

    DEVICE_REGISTRY[device_id]["last_seen"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if event.event_type == IoTEventType.HEARTBEAT:
        DEVICE_REGISTRY[device_id]["status"] = DeviceStatus.ACTIVE

    return {
        "event_id": event.event_id,
        "device_id": device_id,
        "status": "ingested",
        "acknowledged_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
