from pathlib import Path
from backend.app.processors.ocr import OcrProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_ocr_page_preservation_invariant(tmp_path):
    """INVARIANT: OCR pipeline produces a valid searchable PDF with matching page count."""
    p_scan = FIXTURES_DIR / "scanned.pdf"
    processor = OcrProcessor(job_id="test_ocr_inv", work_dir=tmp_path)
    result = processor.run([p_scan], {"language": "eng"})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 1
