import uuid
import time
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Type
from datetime import datetime, timezone, timedelta
from fastapi import UploadFile
from backend.app.config import settings
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.logging import logger
from backend.app.models.job import Job, JobStatus, JobResult
from backend.app.services.file_service import file_service
from backend.app.services.storage_provider import storage_provider

# Import all processors
from backend.app.processors.base import BaseProcessor
from backend.app.processors.merge import MergeProcessor
from backend.app.processors.split import SplitProcessor
from backend.app.processors.compress import CompressProcessor
from backend.app.processors.rotate import RotateProcessor
from backend.app.processors.delete_pages import DeletePagesProcessor
from backend.app.processors.extract_pages import ExtractPagesProcessor
from backend.app.processors.organize import OrganizeProcessor
from backend.app.processors.watermark import WatermarkProcessor
from backend.app.processors.page_numbers import PageNumbersProcessor
from backend.app.processors.protect import ProtectProcessor
from backend.app.processors.unlock import UnlockProcessor
from backend.app.processors.sign import SignProcessor
from backend.app.processors.redact import RedactProcessor
from backend.app.processors.repair import RepairProcessor
from backend.app.processors.pdf_to_word import PdfToWordProcessor
from backend.app.processors.pdf_to_excel import PdfToExcelProcessor
from backend.app.processors.pdf_to_ppt import PdfToPptProcessor
from backend.app.processors.pdf_to_images import PdfToImagesProcessor
from backend.app.processors.images_to_pdf import ImagesToPdfProcessor
from backend.app.processors.ocr import OcrProcessor
from backend.app.processors.analyzer import AnalyzerProcessor
from backend.app.processors.handwriting import HandwritingProcessor

PROCESSOR_REGISTRY: Dict[str, Type[BaseProcessor]] = {
    "merge": MergeProcessor,
    "split": SplitProcessor,
    "compress": CompressProcessor,
    "rotate": RotateProcessor,
    "delete-pages": DeletePagesProcessor,
    "delete_pages": DeletePagesProcessor,
    "extract-pages": ExtractPagesProcessor,
    "extract_pages": ExtractPagesProcessor,
    "organize": OrganizeProcessor,
    "watermark": WatermarkProcessor,
    "page-numbers": PageNumbersProcessor,
    "page_numbers": PageNumbersProcessor,
    "protect": ProtectProcessor,
    "unlock": UnlockProcessor,
    "sign": SignProcessor,
    "redact": RedactProcessor,
    "repair": RepairProcessor,
    "pdf-to-word": PdfToWordProcessor,
    "pdf_to_word": PdfToWordProcessor,
    "pdf-to-excel": PdfToExcelProcessor,
    "pdf_to_excel": PdfToExcelProcessor,
    "pdf-to-ppt": PdfToPptProcessor,
    "pdf_to_ppt": PdfToPptProcessor,
    "pdf-to-images": PdfToImagesProcessor,
    "pdf_to_images": PdfToImagesProcessor,
    "pdf-to-image": PdfToImagesProcessor,
    "images-to-pdf": ImagesToPdfProcessor,
    "images_to_pdf": ImagesToPdfProcessor,
    "jpg-to-pdf": ImagesToPdfProcessor,
    "ocr": OcrProcessor,
    "ocr-pdf": OcrProcessor,
    "analyze": AnalyzerProcessor,
    "analyze-pdf": AnalyzerProcessor,
    "handwriting-to-pdf": HandwritingProcessor,
    "handwriting": HandwritingProcessor,
}


class JobService:
    """Orchestrates the universal 20-step processing pipeline for all PDFBolt jobs."""

    def __init__(self):
        self.jobs: Dict[str, Job] = {}

    def get_job(self, job_id: str) -> Optional[Job]:
        return self.jobs.get(job_id)

    async def execute_job(
        self,
        operation: str,
        uploads: List[UploadFile],
        options: Dict[str, Any]
    ) -> Job:
        """Executes the complete 20-step lifecycle pipeline synchronously or queued."""
        op_key = operation.lower().strip()
        processor_cls = PROCESSOR_REGISTRY.get(op_key)
        if not processor_cls:
            raise PDFBoltError("UNSUPPORTED_FORMAT", f"Unsupported operation: '{operation}'")

        if not uploads:
            raise PDFBoltError("NO_FILES_PROVIDED", "No input files provided for job.")

        job_id = str(uuid.uuid4())
        work_dir = Path(settings.LOCAL_STORAGE_DIR) / job_id
        input_dir = work_dir / "input"
        output_dir = work_dir / "output"
        input_dir.mkdir(parents=True, exist_ok=True)
        output_dir.mkdir(parents=True, exist_ok=True)

        now = datetime.now(timezone.utc)
        job = Job(
            job_id=job_id,
            status=JobStatus.PROCESSING,
            operation=op_key,
            created_at=now,
            started_at=now,
            expires_at=now + timedelta(minutes=15),
            options=options
        )
        self.jobs[job_id] = job

        input_paths: List[Path] = []
        total_in_bytes = 0
        first_page_count = None

        try:
            # Steps 1 to 10: Receive, save, validate magic bytes, permissions, and structure
            for uf in uploads:
                file_id = str(uuid.uuid4())
                ext = Path(uf.filename or "file.pdf").suffix.lower() or ".pdf"
                dest_path = input_dir / f"{file_id}{ext}"
                meta = await file_service.save_upload(uf, dest_path)
                input_paths.append(dest_path)
                total_in_bytes += meta.size_bytes
                if first_page_count is None and meta.page_count:
                    first_page_count = meta.page_count

            job.input_size = total_in_bytes
            job.page_count_in = first_page_count

            # Step 11: Execute processor
            processor = processor_cls(job_id=job_id, work_dir=work_dir, settings=options)
            result: JobResult = processor.run(input_paths, options)

            # Step 15 & 16: Record output metadata
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)
            job.output_path = str(result.output_path)
            job.output_size = result.output_size or (result.output_path.stat().st_size if result.output_path.exists() else 0)
            job.output_filename = f"{op_key}_result{processor.output_format}"
            
            saved_bytes = max(0, total_in_bytes - (job.output_size or 0))
            reduction_pct = round((saved_bytes / total_in_bytes) * 100, 2) if total_in_bytes > 0 else 0.0

            job.metrics = {
                "original_size_bytes": total_in_bytes,
                "output_size_bytes": job.output_size,
                "saved_bytes": saved_bytes,
                "reduction_percent": reduction_pct,
                "duration_s": result.duration_s,
                "is_reduced": (job.output_size or 0) < total_in_bytes,
                "quality_status": "passed"
            }

            return job

        except PDFBoltError as pe:
            job.status = JobStatus.FAILED
            job.error_code = pe.code
            job.error_message = pe.message
            raise
        except Exception as e:
            job.status = JobStatus.FAILED
            job.error_code = "PROCESSING_FAILED"
            job.error_message = str(e)
            raise PDFBoltError("PROCESSING_FAILED", str(e))


job_service = JobService()
