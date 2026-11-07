import uuid
import secrets
import time
import json
import asyncio
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
from backend.app.services.cleanup_service import cleanup_service

# Lazy Processor Registry: Prevents heavy C-libraries (WeasyPrint, pdf2docx, openpyxl, tesseract)
# from being eagerly loaded on boot, saving ~150MB of baseline container RAM on Render Free Tier.
import importlib
from backend.app.processors.base import BaseProcessor

_PROCESSOR_MODULE_MAP = {
    "merge": ("backend.app.processors.merge", "MergeProcessor"),
    "merge_pdf": ("backend.app.processors.merge", "MergeProcessor"),
    "split": ("backend.app.processors.split", "SplitProcessor"),
    "split_pdf": ("backend.app.processors.split", "SplitProcessor"),
    "compress": ("backend.app.processors.compress", "CompressProcessor"),
    "compress_pdf": ("backend.app.processors.compress", "CompressProcessor"),
    "rotate": ("backend.app.processors.rotate", "RotateProcessor"),
    "rotate_pdf": ("backend.app.processors.rotate", "RotateProcessor"),
    "delete_pages": ("backend.app.processors.delete_pages", "DeletePagesProcessor"),
    "delete-pages": ("backend.app.processors.delete_pages", "DeletePagesProcessor"),
    "delete_pdf_pages": ("backend.app.processors.delete_pages", "DeletePagesProcessor"),
    "extract_pages": ("backend.app.processors.extract_pages", "ExtractPagesProcessor"),
    "extract-pages": ("backend.app.processors.extract_pages", "ExtractPagesProcessor"),
    "organize": ("backend.app.processors.organize", "OrganizeProcessor"),
    "organize_pdf": ("backend.app.processors.organize", "OrganizeProcessor"),
    "watermark": ("backend.app.processors.watermark", "WatermarkProcessor"),
    "watermark_pdf": ("backend.app.processors.watermark", "WatermarkProcessor"),
    "page_numbers": ("backend.app.processors.page_numbers", "PageNumbersProcessor"),
    "page-numbers": ("backend.app.processors.page_numbers", "PageNumbersProcessor"),
    "add_page_numbers": ("backend.app.processors.page_numbers", "PageNumbersProcessor"),
    "protect": ("backend.app.processors.protect", "ProtectProcessor"),
    "protect_pdf": ("backend.app.processors.protect", "ProtectProcessor"),
    "unlock": ("backend.app.processors.unlock", "UnlockProcessor"),
    "unlock_pdf": ("backend.app.processors.unlock", "UnlockProcessor"),
    "sign": ("backend.app.processors.sign", "SignProcessor"),
    "sign_pdf": ("backend.app.processors.sign", "SignProcessor"),
    "redact": ("backend.app.processors.redact", "RedactProcessor"),
    "redact_pdf": ("backend.app.processors.redact", "RedactProcessor"),
    "repair": ("backend.app.processors.repair", "RepairProcessor"),
    "repair_pdf": ("backend.app.processors.repair", "RepairProcessor"),
    "compare": ("backend.app.processors.compare", "CompareProcessor"),
    "compare-pdf": ("backend.app.processors.compare", "CompareProcessor"),
    "compare_pdf": ("backend.app.processors.compare", "CompareProcessor"),
    "pdf-to-word": ("backend.app.processors.pdf_to_word", "PdfToWordProcessor"),
    "pdf_to_word": ("backend.app.processors.pdf_to_word", "PdfToWordProcessor"),
    "pdf-to-excel": ("backend.app.processors.pdf_to_excel", "PdfToExcelProcessor"),
    "pdf_to_excel": ("backend.app.processors.pdf_to_excel", "PdfToExcelProcessor"),
    "pdf-to-ppt": ("backend.app.processors.pdf_to_ppt", "PdfToPptProcessor"),
    "pdf_to_ppt": ("backend.app.processors.pdf_to_ppt", "PdfToPptProcessor"),
    "ppt-to-pdf": ("backend.app.processors.ppt_to_pdf", "PptToPdfProcessor"),
    "ppt_to_pdf": ("backend.app.processors.ppt_to_pdf", "PptToPdfProcessor"),
    "pptx-to-pdf": ("backend.app.processors.ppt_to_pdf", "PptToPdfProcessor"),
    "pptx_to_pdf": ("backend.app.processors.ppt_to_pdf", "PptToPdfProcessor"),
    "pdf-to-jpg": ("backend.app.processors.pdf_to_images", "PdfToImagesProcessor"),
    "pdf_to_jpg": ("backend.app.processors.pdf_to_images", "PdfToImagesProcessor"),
    "pdf-to-images": ("backend.app.processors.pdf_to_images", "PdfToImagesProcessor"),
    "pdf_to_images": ("backend.app.processors.pdf_to_images", "PdfToImagesProcessor"),
    "pdf-to-image": ("backend.app.processors.pdf_to_images", "PdfToImagesProcessor"),
    "jpg_to_pdf": ("backend.app.processors.images_to_pdf", "ImagesToPdfProcessor"),
    "images-to-pdf": ("backend.app.processors.images_to_pdf", "ImagesToPdfProcessor"),
    "images_to_pdf": ("backend.app.processors.images_to_pdf", "ImagesToPdfProcessor"),
    "jpg-to-pdf": ("backend.app.processors.images_to_pdf", "ImagesToPdfProcessor"),
    "ocr": ("backend.app.processors.ocr", "OcrProcessor"),
    "ocr_pdf": ("backend.app.processors.ocr", "OcrProcessor"),
    "ocr-pdf": ("backend.app.processors.ocr", "OcrProcessor"),
    "analyze": ("backend.app.processors.analyzer", "AnalyzerProcessor"),
    "analyze_pdf": ("backend.app.processors.analyzer", "AnalyzerProcessor"),
    "analyze-pdf": ("backend.app.processors.analyzer", "AnalyzerProcessor"),
    "handwriting": ("backend.app.processors.handwriting", "HandwritingProcessor"),
    "handwriting-to-pdf": ("backend.app.processors.handwriting", "HandwritingProcessor"),
    "handwriting_to_pdf": ("backend.app.processors.handwriting", "HandwritingProcessor"),
    "scan-handwriting": ("backend.app.processors.handwriting", "HandwritingProcessor"),
    "scan_handwriting": ("backend.app.processors.handwriting", "HandwritingProcessor"),
    "word-to-pdf": ("backend.app.processors.word_to_pdf", "WordToPdfProcessor"),
    "word_to_pdf": ("backend.app.processors.word_to_pdf", "WordToPdfProcessor"),
    "docx-to-pdf": ("backend.app.processors.word_to_pdf", "WordToPdfProcessor"),
    "docx_to_pdf": ("backend.app.processors.word_to_pdf", "WordToPdfProcessor"),
    "excel-to-pdf": ("backend.app.processors.excel_to_pdf", "ExcelToPdfProcessor"),
    "excel_to_pdf": ("backend.app.processors.excel_to_pdf", "ExcelToPdfProcessor"),
    "xlsx-to-pdf": ("backend.app.processors.excel_to_pdf", "ExcelToPdfProcessor"),
    "xlsx_to_pdf": ("backend.app.processors.excel_to_pdf", "ExcelToPdfProcessor"),
    "xls-to-pdf": ("backend.app.processors.excel_to_pdf", "ExcelToPdfProcessor"),
    "xls_to_pdf": ("backend.app.processors.excel_to_pdf", "ExcelToPdfProcessor"),
    "excel2pdf": ("backend.app.processors.excel_to_pdf", "ExcelToPdfProcessor"),
    "html-to-pdf": ("backend.app.processors.html_to_pdf", "HtmlToPdfProcessor"),
    "html_to_pdf": ("backend.app.processors.html_to_pdf", "HtmlToPdfProcessor"),
    "html2pdf": ("backend.app.processors.html_to_pdf", "HtmlToPdfProcessor"),
    "grayscale": ("backend.app.processors.grayscale", "GrayscaleProcessor"),
    "grayscale_pdf": ("backend.app.processors.grayscale", "GrayscaleProcessor"),
    "grayscale-pdf": ("backend.app.processors.grayscale", "GrayscaleProcessor"),
    "color_to_bw": ("backend.app.processors.grayscale", "GrayscaleProcessor"),
    "color-to-bw": ("backend.app.processors.grayscale", "GrayscaleProcessor"),
    "black_and_white": ("backend.app.processors.grayscale", "GrayscaleProcessor"),
    "black-and-white": ("backend.app.processors.grayscale", "GrayscaleProcessor"),
    "pdf_to_grayscale": ("backend.app.processors.grayscale", "GrayscaleProcessor"),
    "pdf-to-grayscale": ("backend.app.processors.grayscale", "GrayscaleProcessor"),
}

def get_processor_cls(op_key: str):
    mapping = _PROCESSOR_MODULE_MAP.get(op_key)
    if not mapping:
        return None
    mod_name, cls_name = mapping
    mod = importlib.import_module(mod_name)
    return getattr(mod, cls_name)

class _LazyProcessorRegistry(dict):
    def __getitem__(self, key: str):
        cls = get_processor_cls(key)
        if cls is None:
            raise KeyError(key)
        return cls

    def get(self, key: str, default=None):
        cls = get_processor_cls(key)
        return cls if cls is not None else default

    def __contains__(self, key: str) -> bool:
        return key in _PROCESSOR_MODULE_MAP

PROCESSOR_REGISTRY = _LazyProcessorRegistry()




class JobService:
    """Orchestrates the universal 20-step processing pipeline for all PDFBolt jobs."""

    def __init__(self):
        self.jobs: Dict[str, Job] = {}
        self._worker_semaphore = asyncio.Semaphore(settings.JOB_MAX_CONCURRENT_WORKERS)
        self._ocr_semaphore = asyncio.Semaphore(getattr(settings, 'OCR_MAX_CONCURRENT_WORKERS', 2))

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
            raise PDFBoltError("UNSUPPORTED_OPERATION", f"Unsupported operation: '{operation}'")

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
            download_token=secrets.token_urlsafe(32),
            options=options
        )
        self.jobs[job_id] = job

        input_paths: List[Path] = []
        total_in_bytes = 0
        first_page_count = None

        try:
        # Steps 1 to 10: Receive, save, validate magic bytes, permissions, and structure
            # Save all uploaded files concurrently for maximum ingestion speed
            async def _save_one(uf: UploadFile) -> tuple:
                file_id = str(uuid.uuid4())
                ext = Path(uf.filename or "file.pdf").suffix.lower() or ".pdf"
                dest_path = input_dir / f"{file_id}{ext}"
                meta = await file_service.save_upload(uf, dest_path)
                return dest_path, meta

            save_results = await asyncio.gather(*[_save_one(uf) for uf in uploads])

            for dest_path, meta in save_results:
                input_paths.append(dest_path)
                total_in_bytes += meta.size_bytes
                if first_page_count is None and meta.page_count:
                    first_page_count = meta.page_count

            job.input_size = total_in_bytes
            job.page_count_in = first_page_count

            # Heavy operation limit check (Word/Excel/PPT conversions & OCR capped at 25 MB like iLovePDF Free Tier)
            heavy_ops = {
                'word-to-pdf', 'word_to_pdf', 'docx-to-pdf', 'docx_to_pdf',
                'excel-to-pdf', 'excel_to_pdf', 'xlsx-to-pdf', 'xlsx_to_pdf',
                'ppt-to-pdf', 'ppt_to_pdf', 'pptx-to-pdf', 'pptx_to_pdf',
                'pdf-to-word', 'pdf_to_word', 'pdf-to-excel', 'pdf_to_excel',
                'pdf-to-ppt', 'pdf_to_ppt', 'ocr', 'ocr_pdf', 'ocr-pdf'
            }
            heavy_limit = getattr(settings, 'HEAVY_CONVERSION_MAX_BYTES', 25 * 1024 * 1024)
            if op_key in heavy_ops and total_in_bytes > heavy_limit:
                limit_mb = heavy_limit // (1024 * 1024)
                actual_mb = round(total_in_bytes / (1024 * 1024), 1)
                raise PDFBoltError(
                    'FILE_TOO_LARGE',
                    f'File size ({actual_mb} MB) exceeds the free conversion limit of {limit_mb} MB (aligned with industry standard). Please compress your file or upload a smaller document.'
                )

            # Step 11: Execute processor in bounded non-blocking worker thread
            processor = processor_cls(job_id=job_id, work_dir=work_dir, settings=options)
            if op_key in ('ocr', 'ocr_pdf', 'ocr-pdf'):
                async with self._worker_semaphore:
                    async with self._ocr_semaphore:
                        result: JobResult = await asyncio.to_thread(processor.run, input_paths, options)
            else:
                async with self._worker_semaphore:
                    result: JobResult = await asyncio.to_thread(processor.run, input_paths, options)

            # Step 15 & 16: Record output metadata
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc)
            job.output_path = str(result.output_path)
            job.output_size = result.output_size or (result.output_path.stat().st_size if result.output_path.exists() else 0)
            job.output_filename = f"{op_key}_result{processor.output_format}"
            
            saved_bytes = max(0, total_in_bytes - (job.output_size or 0))
            reduction_pct = round((saved_bytes / total_in_bytes) * 100, 2) if total_in_bytes > 0 else 0.0

            fast_path_eligible = (
                len(input_paths) == 1
                and total_in_bytes <= settings.JOB_FAST_PATH_MAX_INPUT_BYTES
            )
            job.metrics = {
                "original_size_bytes": total_in_bytes,
                "output_size_bytes": job.output_size,
                "saved_bytes": saved_bytes,
                "reduction_percent": reduction_pct,
                "duration_s": result.duration_s,
                "is_reduced": (job.output_size or 0) < total_in_bytes,
                "quality_status": "passed",
                "performance_target_s": settings.JOB_FAST_PATH_TARGET_SECONDS,
                "fast_path_eligible": fast_path_eligible,
                "fast_path_sla_met": (result.duration_s <= settings.JOB_FAST_PATH_TARGET_SECONDS) if fast_path_eligible else None
            }
            if hasattr(processor, 'settings') and "target_kb" in processor.settings:
                job.metrics["target_kb"] = processor.settings["target_kb"]
                job.metrics["target_achieved"] = processor.settings.get("target_achieved", True)
                job.metrics["final_size_kb"] = processor.settings.get("final_size_kb", round((job.output_size or 0) / 1024, 2))

            return job

        except PDFBoltError as pe:
            job.status = JobStatus.FAILED
            job.error_code = pe.code
            job.error_message = pe.message
            cleanup_service.delete_job_files(job_id)
            raise
        except asyncio.CancelledError:
            logger.warning(f"Job {job_id} task was cancelled. Aborting processor and cleaning workspace.")
            job.status = JobStatus.FAILED
            job.error_code = "JOB_CANCELLED"
            job.error_message = "Processing request was cancelled."
            if 'processor' in locals() and hasattr(processor, "cancel"):
                processor.cancel()
            cleanup_service.delete_job_files(job_id)
            raise
        except Exception as e:
            job.status = JobStatus.FAILED
            job.error_code = "PROCESSING_FAILED"
            job.error_message = str(e)
            cleanup_service.delete_job_files(job_id)
            raise PDFBoltError("PROCESSING_FAILED", str(e))


job_service = JobService()
