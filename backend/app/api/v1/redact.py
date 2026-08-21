import uuid
import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.app.config import settings
from backend.app.processors.redact import RedactProcessor
from backend.app.services.file_service import file_service

router = APIRouter(prefix="/redact", tags=["Redact"])


@router.post("/scan")
async def scan_sensitive_pii(
    file: UploadFile = File(...),
    custom_terms: Optional[str] = Form(default=None)
):
    """
    Scans a PDF document using the 5-engine deterministic sensitive data detector.
    Returns detected candidates (PAN, Aadhaar, Phone, IFSC, UPI, Email, etc.)
    with masked previews, page numbers, and exact bounding boxes.
    """
    terms_list = []
    if custom_terms:
        try:
            terms_list = json.loads(custom_terms)
        except Exception:
            terms_list = [t.strip() for t in custom_terms.split(",") if t.strip()]

    temp_id = str(uuid.uuid4())
    temp_path = Path(settings.LOCAL_STORAGE_DIR) / f"temp_redact_{temp_id}.pdf"

    try:
        await file_service.save_upload(file, temp_path)

        processor = RedactProcessor(job_id=temp_id, work_dir=temp_path.parent)
        findings = processor.scan_document(temp_path, custom_terms=terms_list)

        return {
            "status": "SUCCESS",
            "total_findings": len(findings),
            "findings": findings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        temp_path.unlink(missing_ok=True)
