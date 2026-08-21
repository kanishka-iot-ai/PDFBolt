import os
import json
from typing import Optional, List
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse, Response
from backend.app.core.errors import PDFBoltError
from backend.app.core.security import sanitize_filename
from backend.app.services.job_service import job_service
from backend.app.services.job_manager import job_manager
from backend.app.services.cleanup_service import cleanup_service
from backend.app.models.schemas import JobStatus as LegacyJobStatus

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def _tokenized_job_url(job_id: str, token: Optional[str]) -> str:
    if token:
        return f"/api/v1/jobs/{job_id}/download?token={token}"
    return f"/api/v1/jobs/{job_id}/download"


def _require_job_token(job_id: str, provided_token: Optional[str]) -> None:
    job = job_service.get_job(job_id)
    if job and job.download_token and provided_token != job.download_token:
        raise HTTPException(
            status_code=401,
            detail={
                "code": "INVALID_DOWNLOAD_TOKEN",
                "message": "Invalid or missing job access token."
            }
        )


@router.post("")
async def create_and_process_job(
    operation: str = Form(...),
    options: Optional[str] = Form(default=None),
    settings: Optional[str] = Form(default=None),
    file: Optional[UploadFile] = File(default=None),
    files: Optional[List[UploadFile]] = File(default=None)
):
    """
    Submits a PDF document processing job through the strict 20-step verification pipeline.
    Supports both single-file and multi-file processing operations.
    """
    raw_opts = options or settings or "{}"
    try:
        options_dict = json.loads(raw_opts) if raw_opts else {}
    except Exception:
        options_dict = {}

    # Aggregate uploaded files
    upload_list: List[UploadFile] = []
    if files:
        upload_list.extend(files)
    if file:
        if not upload_list or file not in upload_list:
            upload_list.append(file)

    if not upload_list:
        raise PDFBoltError("NO_FILES_PROVIDED", "No document files uploaded for processing.")

    # Execute universal 20-step pipeline
    job = await job_service.execute_job(
        operation=operation,
        uploads=upload_list,
        options=options_dict
    )

    # Format response compatible with frontend & API spec
    return {
        "success": True,
        "job_id": job.job_id,
        "status": job.status.value,
        "operation": job.operation,
        "poll_url": f"/api/v1/jobs/{job.job_id}",
        "download_url": _tokenized_job_url(job.job_id, job.download_token),
        "output": {
            "filename": job.output_filename or f"{job.operation}_result.pdf",
            "size_bytes": job.output_size or 0
        },
        "metrics": job.metrics,
        "created_at": job.created_at.isoformat(),
        "expires_at": job.expires_at.isoformat()
    }


@router.get("/{job_id}")
def get_job_status(job_id: str, token: Optional[str] = Query(default=None)):
    """Retrieves current job status, invariant metadata, and download links."""
    _require_job_token(job_id, token)
    job = job_service.get_job(job_id)
    if job:
        return {
            "success": job.status.value == "COMPLETED",
            "job_id": job.job_id,
            "status": job.status.value,
            "operation": job.operation,
            "output": {
                "filename": job.output_filename or f"{job.operation}_result.pdf",
                "size_bytes": job.output_size or 0
            },
            "metrics": job.metrics,
            "download_url": _tokenized_job_url(job.job_id, job.download_token),
            "created_at": job.created_at.isoformat(),
            "expires_at": job.expires_at.isoformat()
        }

    legacy_job = job_manager.get_job(job_id)
    if legacy_job:
        return legacy_job

    raise PDFBoltError("JOB_NOT_FOUND", f"Job '{job_id}' not found.")


@router.get("/{job_id}/download")
def download_job_result(
    job_id: str,
    background_tasks: BackgroundTasks,
    token: Optional[str] = Query(default=None)
):
    """
    Downloads the verified output artifact.
    Enforces safe generated filenames and schedules ephemeral workspace cleanup.
    """
    job = job_service.get_job(job_id)
    out_path = None
    out_filename = None

    if job:
        _require_job_token(job_id, token)
        if job.status.value != "COMPLETED":
            raise PDFBoltError("JOB_STILL_PROCESSING", f"Job is not completed yet (current status: {job.status.value}).")
        out_path = job.output_path
        out_filename = sanitize_filename(job.output_filename or f"{job.operation}_result.pdf")
    elif job_id in job_manager.jobs:
        legacy_data = job_manager.jobs[job_id]
        status_val = legacy_data.get("status")
        status_str = getattr(status_val, "value", str(status_val))
        if status_str != "COMPLETED":
            raise PDFBoltError("JOB_STILL_PROCESSING", f"Job is not completed yet.")
        out_path = legacy_data.get("output_path")
        out_filename = sanitize_filename(os.path.basename(out_path or f"job_{job_id}.pdf"))

    if not out_path or not os.path.exists(out_path):
        raise PDFBoltError("STORAGE_ERROR", "Output artifact file missing or already purged by lifecycle TTL.")

    # Schedule post-download cleanup
    background_tasks.add_task(cleanup_service.handle_post_download_cleanup, job_id, job_manager)

    ext = Path(out_path).suffix.lower()
    media_types = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".zip": "application/zip",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=out_path,
        filename=out_filename,
        media_type=media_type
    )


@router.get("/{job_id}/status")
def get_job_status_alias(job_id: str, token: Optional[str] = Query(default=None)):
    return get_job_status(job_id, token)


@router.delete("/{job_id}")
def cancel_and_delete_job(job_id: str, token: Optional[str] = Query(default=None)):
    """Immediately terminates processing and permanently purges temporary work directories."""
    _require_job_token(job_id, token)
    job = job_service.get_job(job_id)
    if job:
        job.status = job.status.CANCELLED
    
    if job_id in job_manager.jobs:
        job_manager.jobs[job_id]["status"] = LegacyJobStatus.CANCELLED

    cleanup_service.delete_job_files(job_id)

    return {
        "success": True,
        "job_id": job_id,
        "status": "CANCELLED",
        "message": "Job cancelled and workspace purged immediately."
    }


@router.post("/{job_id}/cancel")
def cancel_job_post_alias(job_id: str, token: Optional[str] = Query(default=None)):
    return cancel_and_delete_job(job_id, token)
