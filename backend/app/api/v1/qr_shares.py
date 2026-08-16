from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Query, Header, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from backend.app.models.qr_share import QRShareResponse, QRShareRevokeRequest, QRShareStatus
from backend.app.services.qr_share_manager import qr_share_manager
from backend.app.core.errors import PDFProcessingException, ErrorCode

router = APIRouter(prefix="/qr-shares", tags=["QR Shares"])


@router.post("", response_model=QRShareResponse)
async def create_qr_share(
    file: UploadFile = File(...),
    duration_seconds: int = Form(default=86400),
    pin: Optional[str] = Form(default=None),
    one_time_scan: bool = Form(default=False)
):
    """
    Creates a temporary QR PDF share with configurable retention (15m, 1h, 24h [default], 7d, 30d).
    Returns an unguessable share URL and a private revocation token.
    """
    content = await file.read()
    if not content:
        raise PDFProcessingException(ErrorCode.FILE_EMPTY, "Uploaded PDF file is empty.", 400)

    # Magic-byte check for valid PDF
    if not content.startswith(b"%PDF-"):
        raise PDFProcessingException(ErrorCode.INVALID_PDF, "Only valid PDF documents can be shared.", 400)

    return qr_share_manager.create_share(
        content=content,
        filename=file.filename or "document.pdf",
        duration_seconds=duration_seconds,
        pin=pin if pin and pin.strip() else None,
        one_time_scan=one_time_scan
    )


@router.get("/{share_id}", response_model=QRShareResponse)
def get_qr_share_info(
    share_id: str,
    pin: Optional[str] = Query(default=None)
):
    """
    Retrieves public share metadata for recipient verification.
    Returns 410 Gone if expired or revoked.
    """
    return qr_share_manager.get_share(share_id=share_id, pin=pin)


@router.get("/{share_id}/download")
def download_qr_share_document(
    share_id: str,
    background_tasks: BackgroundTasks,
    pin: Optional[str] = Query(default=None)
):
    """
    Downloads the shared PDF document.
    Enforces expiration, PIN validation, and one-time scan purge.
    """
    file_path, filename = qr_share_manager.get_file_for_download(share_id=share_id, pin=pin)

    share = qr_share_manager.shares.get(share_id)
    if share and share.get("one_time_scan"):
        # Schedule immediate post-transfer deletion for one-time shares
        background_tasks.add_task(qr_share_manager.purge_one_time_share, share_id)

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf"
    )


@router.post("/{share_id}/revoke")
def revoke_qr_share(
    share_id: str,
    payload: QRShareRevokeRequest
):
    """
    Revokes the QR share immediately and purges the file from storage.
    Requires the revocation token generated upon creation.
    """
    qr_share_manager.revoke_share(share_id=share_id, revocation_token=payload.revocation_token)
    return {
        "success": True,
        "share_id": share_id,
        "status": "REVOKED",
        "message": "QR share has been revoked and the file has been deleted immediately."
    }
