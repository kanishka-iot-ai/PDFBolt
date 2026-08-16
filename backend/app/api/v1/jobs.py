import json
import os
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from backend.app.models.schemas import JobResponse, OperationType, JobStatus
from backend.app.services.job_manager import job_manager
from backend.app.services.storage import storage
from backend.app.services.cleanup_service import cleanup_service
from backend.app.core.errors import PDFProcessingException, ErrorCode
from backend.app.core.security import sanitize_filename

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("", response_model=JobResponse)
async def create_and_process_job(
    operation: str = Form(...),
    settings: Optional[str] = Form(default="{}"),
    file: Optional[UploadFile] = File(default=None),
    files: Optional[List[UploadFile]] = File(default=None)
):
    """
    Submits a PDF document processing job.
    Executes through the strict 8-stage integrity pipeline and returns the canonical result.
    """
    try:
        op_enum = OperationType(operation)
    except ValueError:
        raise PDFProcessingException(
            error_code=ErrorCode.PROCESSING_FAILED,
            message=f"Unsupported operation: '{operation}'",
            status_code=400
        )

    try:
        settings_dict = json.loads(settings) if settings else {}
    except Exception:
        settings_dict = {}

    # Handle multiple files (e.g. merge) vs single file
    if op_enum == OperationType.MERGE:
        uploaded_files = files or ([file] if file else [])
        if not uploaded_files or len(uploaded_files) < 2:
            raise PDFProcessingException(
                error_code=ErrorCode.INVALID_PDF,
                message="Merge operation requires at least two PDF documents.",
                status_code=400
            )

        job_id = job_manager.create_job(op_enum, settings_dict)
        files_data = []
        for uf in uploaded_files:
            content = await uf.read()
            clean_name = sanitize_filename(uf.filename or "file.pdf")
            files_data.append((content, clean_name))

        from backend.app.processors.merge import MergeProcessor
        proc = MergeProcessor(settings_dict)
        out_bytes, out_name, metrics = proc.process_multiple(files_data)

        # Save output
        clean_out_name, out_path = storage.save_output_sync(job_id, out_name, out_bytes)
        
        job = job_manager.jobs[job_id]
        job["status"] = JobStatus.COMPLETED
        job["progress"] = 100
        job["output_path"] = out_path
        job["output"] = {"filename": clean_out_name, "size_bytes": len(out_bytes)}
        job["metrics"] = metrics

        return job_manager.get_job(job_id)

    # Single File Operation
    if not file:
        raise PDFProcessingException(
            error_code=ErrorCode.FILE_EMPTY,
            message="No file uploaded for processing.",
            status_code=400
        )

    content = await file.read()
    clean_name = sanitize_filename(file.filename or "document.pdf")

    job_id = job_manager.create_job(op_enum, settings_dict)
    return job_manager.execute_job_sync(job_id, content, clean_name)


@router.get("/{job_id}", response_model=JobResponse)
def get_job_status(job_id: str):
    """
    Polls the live progress and canonical status of a processing job.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise PDFProcessingException(
            error_code=ErrorCode.JOB_NOT_FOUND,
            message=f"Job '{job_id}' not found.",
            status_code=404
        )
    return job


@router.post("/{job_id}/cancel")
def cancel_job(job_id: str):
    """
    Cancels an active or queued processing job and immediately purges all temporary files.
    """
    success = job_manager.cancel_job(job_id)
    if not success:
        raise PDFProcessingException(
            error_code=ErrorCode.JOB_NOT_FOUND,
            message=f"Job '{job_id}' not found.",
            status_code=404
        )
    return {"success": True, "job_id": job_id, "status": "CANCELLED", "message": "Job cancelled and temporary files purged immediately."}


@router.get("/{job_id}/download")
def download_job_result(job_id: str, background_tasks: BackgroundTasks):
    """
    Securely downloads the validated output artifact from a completed job.
    Triggers automatic file cleanup post-download.
    """
    job = job_manager.jobs.get(job_id)
    if not job:
        raise PDFProcessingException(
            error_code=ErrorCode.JOB_NOT_FOUND,
            message=f"Job '{job_id}' not found.",
            status_code=404
        )

    if job["status"] != JobStatus.COMPLETED:
        raise PDFProcessingException(
            error_code=ErrorCode.PROCESSING_FAILED,
            message=f"Job is not completed yet (current status: {job['status'].value}).",
            status_code=400
        )

    out_path = job.get("output_path")
    if not out_path or not os.path.exists(out_path):
        raise PDFProcessingException(
            error_code=ErrorCode.STORAGE_ERROR,
            message="Output file artifact missing or already purged.",
            status_code=404
        )

    out = job.get("output")
    out_filename = getattr(out, "filename", None) or (out.get("filename") if isinstance(out, dict) else "result.pdf") or "result.pdf"
    
    # Schedule immediate auto-cleanup of the temporary file after transfer
    background_tasks.add_task(cleanup_service.handle_post_download_cleanup, job_id, job_manager)

    return FileResponse(
        path=out_path,
        filename=out_filename,
        media_type="application/octet-stream"
    )
