from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    VALIDATING = "VALIDATING"
    ANALYZING = "ANALYZING"
    PROCESSING = "PROCESSING"
    VALIDATING_OUTPUT = "VALIDATING_OUTPUT"
    QUALITY_CHECK = "QUALITY_CHECK"
    UPLOADING_RESULT = "UPLOADING_RESULT"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    DELETED = "DELETED"


class OperationType(str, Enum):
    COMPRESS = "compress"
    MERGE = "merge"
    SPLIT = "split"
    ROTATE = "rotate"
    DELETE_PAGES = "delete_pages"
    EXTRACT_PAGES = "extract_pages"
    WATERMARK = "watermark"
    PAGE_NUMBER = "page_number"
    PROTECT = "protect"
    UNLOCK = "unlock"
    OCR = "ocr"
    PDF_TO_WORD = "pdf_to_word"
    PDF_TO_EXCEL = "pdf_to_excel"
    PDF_TO_PPT = "pdf_to_ppt"
    PDF_TO_IMAGE = "pdf_to_image"
    IMAGE_TO_PDF = "image_to_pdf"
    ANALYZE = "analyze"


class FileMetadata(BaseModel):
    filename: str
    size_bytes: int = Field(..., description="Raw byte size of the file")
    mime_type: Optional[str] = None
    page_count: Optional[int] = None


class CompressionMetrics(BaseModel):
    original_size_bytes: int
    output_size_bytes: int
    saved_bytes: int
    reduction_percent: float
    is_reduced: bool
    quality_status: str


class QualityReport(BaseModel):
    status: str = "passed"  # "passed", "warning", "failed"
    score: Optional[float] = None
    notes: List[str] = []


class JobCreateRequest(BaseModel):
    operation: OperationType
    settings: Dict[str, Any] = Field(default_factory=dict)
    callback_url: Optional[str] = None


class JobResponse(BaseModel):
    job_id: str
    operation: str
    status: JobStatus
    progress: int = Field(default=0, ge=0, le=100)
    created_at: str
    expires_at: Optional[str] = None
    hard_delete_at: Optional[str] = None
    deleted_at: Optional[str] = None
    retention_policy: str = "15_MIN_AUTO_DELETE"
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    input: Optional[FileMetadata] = None
    output: Optional[FileMetadata] = None
    metrics: Optional[Dict[str, Any]] = None
    quality: Optional[QualityReport] = None
    download_url: Optional[str] = None
    error: Optional[Dict[str, Any]] = None


class CanonicalResultResponse(BaseModel):
    success: bool
    job_id: str
    operation: str
    input: FileMetadata
    output: Optional[FileMetadata] = None
    metrics: Optional[Dict[str, Any]] = None
    quality: Optional[QualityReport] = None
    download: Optional[Dict[str, str]] = None
    error: Optional[Dict[str, Any]] = None


class AnalysisResult(BaseModel):
    success: bool
    filename: str
    size_bytes: int
    page_count: int
    pdf_version: Optional[str] = None
    is_encrypted: bool = False
    text_present: bool = True
    image_count: int = 0
    font_count: int = 0
    table_count: int = 0
    reading_time_minutes: int = 1
    detected_type: str = "mixed"  # text-heavy, image-heavy, scanned, presentation, mixed
    recommended_profile: str = "balanced"
    expected_reduction: str = "40%-60%"
    optimization_potential: str = "moderate"
    recommendation_reason: str = ""
    summary: Optional[str] = None
    topics: List[str] = []
