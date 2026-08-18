from pathlib import Path
from docx import Document
from backend.app.processors.pdf_to_word import PdfToWordProcessor
from backend.app.core.validation import validate_docx_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_pdf_to_word_contains_text_invariant(tmp_path):
    """INVARIANT: DOCX opens, passes zip validation, and contains extracted paragraphs."""
    p1 = FIXTURES_DIR / "1page_text.pdf"
    processor = PdfToWordProcessor(job_id="test_word_inv", work_dir=tmp_path)
    result = processor.run([p1], {})

    assert result.status == "COMPLETED"
    validate_docx_output(result.output_path)
    
    doc = Document(str(result.output_path))
    full_text = " ".join([p.text for p in doc.paragraphs])
    assert len(full_text.strip()) > 5
