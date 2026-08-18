import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File
from backend.app.config import settings
from backend.app.core.errors import PDFBoltError
from backend.app.services.file_service import file_service
from backend.app.processors.analyzer import AnalyzerProcessor

router = APIRouter(prefix="/analyze", tags=["Analyzer"])


@router.post("")
async def analyze_document(file: UploadFile = File(...)):
    """Deep structural PDF document inspection and intelligence extraction."""
    if not file:
        raise PDFBoltError("NO_FILES_PROVIDED", "No PDF file provided for analysis.")

    temp_id = str(uuid.uuid4())
    temp_path = Path(settings.LOCAL_STORAGE_DIR) / f"temp_analyze_{temp_id}.pdf"

    try:
        await file_service.save_upload(file, temp_path)
        processor = AnalyzerProcessor(job_id=temp_id, work_dir=temp_path.parent)
        result = processor.analyze_pdf_structure(temp_path)
        return result
    finally:
        temp_path.unlink(missing_ok=True)
