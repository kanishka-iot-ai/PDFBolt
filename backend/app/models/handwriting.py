from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class AIProviderType(str, Enum):
    LOCAL = "local"
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    TESSERACT = "tesseract"
    FALLBACK = "fallback"


class ConfidenceLevel(str, Enum):
    HIGH = "high"       # >= 0.85
    MEDIUM = "medium"   # 0.65 - 0.84
    LOW = "low"         # < 0.65


class PaperSize(str, Enum):
    A4 = "A4"
    LETTER = "Letter"
    A5 = "A5"


class MarginType(str, Enum):
    NORMAL = "normal"
    NARROW = "narrow"
    WIDE = "wide"


class FontFamily(str, Enum):
    INTER = "Inter"
    ARIAL = "Arial"
    TIMES = "Times New Roman"
    GEORGIA = "Georgia"
    COURIER = "Courier"


class TextAlignment(str, Enum):
    LEFT = "left"
    CENTER = "center"
    JUSTIFY = "justify"


class ExportFormat(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"


class RecognizedSegment(BaseModel):
    text: str
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    line_number: int = 1
    is_uncertain: bool = False
    is_heading: bool = False
    is_bullet: bool = False


class DocumentStructure(BaseModel):
    title: Optional[str] = None
    headings: List[str] = Field(default_factory=list)
    paragraphs: List[str] = Field(default_factory=list)
    bullet_points: List[str] = Field(default_factory=list)
    has_tables: bool = False


class PageRecognitionResult(BaseModel):
    page_number: int
    text: str
    raw_text: str
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    confidence_level: ConfidenceLevel = ConfidenceLevel.HIGH
    has_handwriting: bool = True
    uncertain_words: List[str] = Field(default_factory=list)
    provider_used: str = "local"
    processing_time_ms: int = 0
    warnings: List[str] = Field(default_factory=list)


class HandwritingPagePayload(BaseModel):
    page_number: int
    image_base64: str = Field(..., description="Base64 encoded JPEG/PNG image or data URL")
    rotation: int = 0
    enhanced: bool = True


class HandwritingRecognitionRequest(BaseModel):
    pages: List[HandwritingPagePayload]
    ai_enhanced: bool = False
    language: str = "eng"
    preserve_structure: bool = True
    provider: Optional[AIProviderType] = None


class HandwritingRecognitionResponse(BaseModel):
    success: bool
    job_id: str
    pages: List[PageRecognitionResult]
    overall_confidence: float
    overall_confidence_level: ConfidenceLevel
    provider_used: str
    warnings: List[str] = Field(default_factory=list)


class EnhancementAction(str, Enum):
    IMPROVE_RECOGNITION = "improve_recognition"
    FIX_OCR_ERRORS = "fix_ocr_errors"
    PRESERVE_EXACT = "preserve_exact"


class TranscriptionEnhanceRequest(BaseModel):
    text: str
    action: EnhancementAction = EnhancementAction.IMPROVE_RECOGNITION
    language: str = "eng"


class TranscriptionEnhanceResponse(BaseModel):
    success: bool
    enhanced_text: str
    original_text: str
    changes_made: List[str] = Field(default_factory=list)
    provider_used: str


class PDFDesignSettingsPayload(BaseModel):
    paper_size: PaperSize = PaperSize.A4
    margin: MarginType = MarginType.NORMAL
    font: FontFamily = FontFamily.INTER
    font_size: int = Field(default=12, ge=8, le=24)
    line_spacing: float = Field(default=1.15, ge=1.0, le=3.0)
    alignment: TextAlignment = TextAlignment.LEFT
    header_text: Optional[str] = None
    footer_text: Optional[str] = None
    include_page_numbers: bool = True


class HandwritingGenerateDocumentRequest(BaseModel):
    title: Optional[str] = "Handwritten Notes"
    pages_text: List[str] = Field(..., description="List of text per page in correct order")
    design: PDFDesignSettingsPayload = Field(default_factory=PDFDesignSettingsPayload)
    export_format: ExportFormat = ExportFormat.PDF
