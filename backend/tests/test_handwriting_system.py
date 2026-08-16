import io
import base64
import pytest
from PIL import Image, ImageDraw, ImageFont
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.ai.base import HandwritingAIProvider
from backend.app.services.ai.providers import LocalOCRProvider, CloudAIProvider, FallbackProvider
from backend.app.services.ai.factory import get_handwriting_provider
from backend.app.processors.handwriting_to_pdf import HandwritingDocumentGenerator
from backend.app.models.handwriting import (
    PDFDesignSettingsPayload,
    PaperSize,
    MarginType,
    FontFamily,
    TextAlignment,
    ExportFormat,
    EnhancementAction
)

client = TestClient(app)


def create_sample_handwritten_image() -> bytes:
    """Helper creating a test JPEG image containing synthetic handwriting text."""
    img = Image.new("RGB", (600, 300), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((30, 40), "Handwritten Meeting Notes", fill=(20, 20, 20))
    draw.text((30, 90), "1. Review project timeline", fill=(40, 40, 40))
    draw.text((30, 130), "2. Finalize client agreement", fill=(40, 40, 40))
    draw.text((30, 170), "3. Execute deployment plan", fill=(40, 40, 40))
    
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_handwriting_ai_provider_abstraction():
    """Verify provider interface contracts and confidence estimation."""
    provider = LocalOCRProvider()
    assert isinstance(provider, HandwritingAIProvider)
    assert provider.provider_name == "local_ocr"

    img_bytes = create_sample_handwritten_image()
    result = await provider.recognize_page(img_bytes, page_number=1)

    assert result.page_number == 1
    assert result.confidence > 0.0
    assert result.has_handwriting is True
    assert result.provider_used == "local_ocr"


@pytest.mark.asyncio
async def test_fallback_provider_graceful_degradation():
    """Verify fallback provider cascades to local when cloud provider fails or lacks keys."""
    # When no AI_API_KEY is present, FallbackProvider executes LocalOCRProvider without failing
    fallback = FallbackProvider(
        primary=CloudAIProvider(api_key=""),
        fallback=LocalOCRProvider()
    )
    img_bytes = create_sample_handwritten_image()
    result = await fallback.recognize_page(img_bytes, page_number=2)

    assert result.page_number == 2
    assert result.has_handwriting is True
    assert len(result.text) > 0


def test_handwriting_recognition_endpoint():
    """Test POST /api/v1/handwriting/recognize with multi-page base64 payloads."""
    img_bytes = create_sample_handwritten_image()
    b64_img = base64.b64encode(img_bytes).decode('utf-8')

    payload = {
        "pages": [
            {
                "page_number": 1,
                "image_base64": f"data:image/jpeg;base64,{b64_img}",
                "rotation": 0,
                "enhanced": True
            },
            {
                "page_number": 2,
                "image_base64": b64_img,
                "rotation": 0,
                "enhanced": True
            }
        ],
        "ai_enhanced": False,
        "language": "eng",
        "preserve_structure": True
    }

    response = client.post("/api/v1/handwriting/recognize", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["job_id"].startswith("hw-")
    assert len(data["pages"]) == 2
    assert data["pages"][0]["page_number"] == 1
    assert data["pages"][1]["page_number"] == 2
    assert data["overall_confidence"] > 0.0


def test_handwriting_enhancement_endpoint():
    """Test POST /api/v1/handwriting/enhance with structural actions."""
    raw_ocr = "Meeting notes\n- item 0ne with err0r\n- item tw0"
    payload = {
        "text": raw_ocr,
        "action": "fix_ocr_errors",
        "language": "eng"
    }

    response = client.post("/api/v1/handwriting/enhance", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["enhanced_text"]) > 0


def test_handwriting_document_generation_pdf():
    """Test document generator producing clean ReportLab PDF with custom styling."""
    pages = [
        "Executive Summary\n\nThis project delivers advanced in-browser and AI handwriting recognition.",
        "Action Items\n\n• Deploy to staging environment\n• Run cross-browser integration tests"
    ]
    design = PDFDesignSettingsPayload(
        paper_size=PaperSize.A4,
        margin=MarginType.NORMAL,
        font=FontFamily.INTER,
        font_size=12,
        line_spacing=1.15,
        alignment=TextAlignment.LEFT,
        header_text="CONFIDENTIAL NOTES",
        footer_text="PDFBolt Computer-Typed",
        include_page_numbers=True
    )

    pdf_bytes = HandwritingDocumentGenerator.generate(
        pages_text=pages,
        title="Project Roadmap",
        design=design,
        export_format=ExportFormat.PDF
    )

    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")


def test_handwriting_document_generation_docx_and_txt():
    """Test document generator producing clean DOCX and TXT outputs."""
    pages = ["Page 1 Content", "Page 2 Content"]

    docx_bytes = HandwritingDocumentGenerator.generate(
        pages_text=pages,
        title="Notes",
        export_format=ExportFormat.DOCX
    )
    assert len(docx_bytes) > 200
    assert docx_bytes[:2] == b"PK"  # Zip/Docx magic header

    txt_bytes = HandwritingDocumentGenerator.generate(
        pages_text=pages,
        title="Notes",
        export_format=ExportFormat.TXT
    )
    assert b"=== NOTES ===" in txt_bytes
    assert b"Page 1 Content" in txt_bytes


def test_generate_endpoint_http_response():
    """Test POST /api/v1/handwriting/generate returning proper headers and anti-indexing tags."""
    payload = {
        "title": "Quarterly Objectives",
        "pages_text": ["Objective 1: High OCR Accuracy", "Objective 2: Zero Cloud Leaks"],
        "design": {
            "paper_size": "A4",
            "margin": "normal",
            "font": "Inter",
            "font_size": 12,
            "line_spacing": 1.15,
            "alignment": "left",
            "include_page_numbers": True
        },
        "export_format": "pdf"
    }

    response = client.post("/api/v1/handwriting/generate", json=payload)
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert "Quarterly_Objectives.pdf" in response.headers["Content-Disposition"]
    assert response.headers["X-Robots-Tag"] == "noindex, nofollow, noarchive"
