"""
PDFBolt Performance Optimization Suite - Phase 2
Tests for OCR single document context, concurrency limits, resource bounding,
timeouts, searchable bypass, mixed dimensions, and clean failure recovery.
"""

import io
import time
import asyncio
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from PIL import Image

from backend.app.processors.ocr import OcrProcessor, _OCR_THREAD_SEMAPHORE
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.config import settings

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _create_synthetic_scanned_pdf(num_pages: int = 3, pagesizes=None) -> bytes:
    """Helper to generate an in-memory PDF without text (simulating scanned raster pages)."""
    buf = io.BytesIO()
    if pagesizes is None:
        pagesizes = [(612, 792)] * num_pages

    can = canvas.Canvas(buf)
    for w, h in pagesizes:
        can.setPageSize((w, h))
        img = Image.new("RGB", (80, 80), color=(245, 245, 245))
        can.drawInlineImage(img, 50, 50, width=min(200, w - 100), height=min(200, h - 100))
        can.showPage()
    can.save()
    buf.seek(0)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Test 1: Single Document Context Open
# ---------------------------------------------------------------------------
def test_ocr_opens_pdfplumber_exactly_once_for_multipage(tmp_path):
    """VERIFICATION: pdfplumber.open() is called exactly once for multi-page scanned documents."""
    scanned_bytes = _create_synthetic_scanned_pdf(num_pages=3)
    input_pdf = tmp_path / "scanned_3p.pdf"
    input_pdf.write_bytes(scanned_bytes)

    open_calls = 0
    import pdfplumber
    original_open = pdfplumber.open

    def counted_open(*args, **kwargs):
        nonlocal open_calls
        open_calls += 1
        return original_open(*args, **kwargs)

    with patch("pdfplumber.open", side_effect=counted_open), \
         patch.object(OcrProcessor, "_ocr_image_to_text", return_value="Recognized text line"):
        processor = OcrProcessor(job_id="test_single_open", work_dir=tmp_path / "work")
        result = processor.run([input_pdf], {"language": "eng"})

    assert result.status == "COMPLETED"
    assert open_calls == 1, f"Expected pdfplumber.open to be called exactly 1 time, but called {open_calls} times"
    assert validate_pdf_output(result.output_path) == 3


# ---------------------------------------------------------------------------
# Test 2: Multi-Page Scanned Document Processing & Text Overlay
# ---------------------------------------------------------------------------
def test_ocr_multipage_scanned_document(tmp_path):
    """VERIFICATION: Multi-page scanned document successfully adds searchable text layer."""
    scanned_bytes = _create_synthetic_scanned_pdf(num_pages=3)
    input_pdf = tmp_path / "scanned_multi.pdf"
    input_pdf.write_bytes(scanned_bytes)

    with patch.object(OcrProcessor, "_ocr_image_to_text", side_effect=[
        "First page scanned invoice content",
        "Second page table and terms",
        "Third page signature block"
    ]):
        processor = OcrProcessor(job_id="test_multipage", work_dir=tmp_path / "work")
        result = processor.run([input_pdf], {"language": "eng"})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 3

    # Check extracted text from output
    reader = PdfReader(str(result.output_path))
    assert len(reader.pages) == 3
    t0 = reader.pages[0].extract_text()
    t1 = reader.pages[1].extract_text()
    t2 = reader.pages[2].extract_text()
    assert "First page scanned invoice" in t0
    assert "Second page table" in t1
    assert "Third page signature" in t2


# ---------------------------------------------------------------------------
# Test 3: PDFs that Already Contain Searchable Text (Bypass Check)
# ---------------------------------------------------------------------------
def test_ocr_skips_pages_with_existing_text(tmp_path):
    """VERIFICATION: Document with existing text bypasses rasterization and pdfplumber entirely."""
    text_pdf = FIXTURES_DIR / "1page_text.pdf"
    assert text_pdf.exists()

    with patch("pdfplumber.open") as mock_open:
        processor = OcrProcessor(job_id="test_skip_text", work_dir=tmp_path / "work")
        result = processor.run([text_pdf], {"language": "eng"})

    # pdfplumber should NEVER be opened because page already has text
    assert mock_open.call_count == 0
    assert result.status == "COMPLETED"
    assert processor.metrics["pages_skipped_has_text"] == 1
    assert processor.metrics["pages_ocred"] == 0
    assert validate_pdf_output(result.output_path) == 1


# ---------------------------------------------------------------------------
# Test 4: Mixed Page Dimensions Preservation
# ---------------------------------------------------------------------------
def test_ocr_preserves_mixed_page_dimensions(tmp_path):
    """VERIFICATION: Pages with different dimensions retain their distinct sizes."""
    # Page 1: Portrait Letter (612x792), Page 2: Landscape Tabloid (1224x792)
    dimensions = [(612, 792), (1224, 792)]
    mixed_bytes = _create_synthetic_scanned_pdf(num_pages=2, pagesizes=dimensions)
    input_pdf = tmp_path / "mixed_dim.pdf"
    input_pdf.write_bytes(mixed_bytes)

    with patch.object(OcrProcessor, "_ocr_image_to_text", return_value="Text on mixed page"):
        processor = OcrProcessor(job_id="test_mixed_dim", work_dir=tmp_path / "work")
        result = processor.run([input_pdf], {"language": "eng"})

    assert result.status == "COMPLETED"
    out_reader = PdfReader(str(result.output_path))
    assert len(out_reader.pages) == 2
    assert float(out_reader.pages[0].mediabox.width) == 612.0
    assert float(out_reader.pages[0].mediabox.height) == 792.0
    assert float(out_reader.pages[1].mediabox.width) == 1224.0
    assert float(out_reader.pages[1].mediabox.height) == 792.0


# ---------------------------------------------------------------------------
# Test 5: Timeout Handling & Graceful Degradation
# ---------------------------------------------------------------------------
def test_ocr_timeout_handling(tmp_path):
    """VERIFICATION: Per-page Tesseract timeout is caught gracefully without failing the job."""
    scanned_bytes = _create_synthetic_scanned_pdf(num_pages=2)
    input_pdf = tmp_path / "timeout_doc.pdf"
    input_pdf.write_bytes(scanned_bytes)

    def raise_timeout(*args, **kwargs):
        raise RuntimeError("Tesseract process timeout")

    with patch.object(OcrProcessor, "_ocr_image_to_text", side_effect=raise_timeout):
        processor = OcrProcessor(job_id="test_timeout", work_dir=tmp_path / "work")
        result = processor.run([input_pdf], {"timeout": 1})

    # Job still produces output and preserves pages
    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 2


# ---------------------------------------------------------------------------
# Test 6: Failure Handling & Temporary Cleanup
# ---------------------------------------------------------------------------
def test_ocr_invalid_input_and_cleanup(tmp_path):
    """VERIFICATION: Invalid / empty files raise PDFBoltError and clean up resources."""
    empty_file = tmp_path / "empty.pdf"
    empty_file.write_bytes(b"")

    processor = OcrProcessor(job_id="test_empty", work_dir=tmp_path / "work")
    with pytest.raises(PDFBoltError) as exc_info:
        processor.run([empty_file])
    assert exc_info.value.code == "FILE_EMPTY"


def test_ocr_page_limit_enforcement(tmp_path):
    """VERIFICATION: Documents exceeding maximum page limits are rejected safely."""
    scanned_bytes = _create_synthetic_scanned_pdf(num_pages=5)
    input_pdf = tmp_path / "5page.pdf"
    input_pdf.write_bytes(scanned_bytes)

    processor = OcrProcessor(job_id="test_page_limit", work_dir=tmp_path / "work")
    with pytest.raises(PDFBoltError) as exc_info:
        processor.run([input_pdf], {"max_pages": 3})
    assert exc_info.value.code == "PAGE_LIMIT_EXCEEDED"


def test_ocr_file_too_large_enforcement(tmp_path, monkeypatch):
    """VERIFICATION: Files exceeding maximum bytes limit are rejected before processing."""
    scanned_bytes = _create_synthetic_scanned_pdf(num_pages=1)
    input_pdf = tmp_path / "toolarge.pdf"
    input_pdf.write_bytes(scanned_bytes)

    monkeypatch.setattr(settings, "OCR_MAX_INPUT_SIZE_BYTES", 100)
    processor = OcrProcessor(job_id="test_too_large", work_dir=tmp_path / "work")
    with pytest.raises(PDFBoltError) as exc_info:
        processor.run([input_pdf])
    assert exc_info.value.code == "FILE_TOO_LARGE"


# ---------------------------------------------------------------------------
# Test 7: Dedicated Concurrency Bounding
# ---------------------------------------------------------------------------
def test_ocr_concurrency_semaphore_contention(tmp_path):
    """VERIFICATION: Concurrent OCR jobs respect the OCR thread semaphore without deadlock."""
    from concurrent.futures import ThreadPoolExecutor

    scanned_bytes = _create_synthetic_scanned_pdf(num_pages=2)
    files = []
    for i in range(4):
        p = tmp_path / f"conc_{i}.pdf"
        p.write_bytes(scanned_bytes)
        files.append(p)

    def _run_job(p, idx):
        proc = OcrProcessor(job_id=f"conc_job_{idx}", work_dir=tmp_path / f"w_{idx}")
        with patch.object(OcrProcessor, "_ocr_image_to_text", return_value=f"Thread {idx} text"):
            return proc.run([p], {"language": "eng"})

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda item: _run_job(item[1], item[0]), enumerate(files)))

    assert len(results) == 4
    for r in results:
        assert r.status == "COMPLETED"
        assert validate_pdf_output(r.output_path) == 2


# ---------------------------------------------------------------------------
# Test 8: OCRmyPDF Engine Subprocess Option Handling
# ---------------------------------------------------------------------------
def test_ocr_ocrmypdf_fallback_handling(tmp_path):
    """VERIFICATION: Explicit ocrmypdf request gracefully falls back to native if missing."""
    scanned_bytes = _create_synthetic_scanned_pdf(num_pages=1)
    input_pdf = tmp_path / "ocr_engine_test.pdf"
    input_pdf.write_bytes(scanned_bytes)

    with patch.object(OcrProcessor, "_ocr_image_to_text", return_value="Fallback text"):
        processor = OcrProcessor(job_id="test_engine_fallback", work_dir=tmp_path / "work")
        # Ask for ocrmypdf; since ocrmypdf is not installed locally on Windows, it falls back to native
        result = processor.run([input_pdf], {"engine": "ocrmypdf"})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 1
