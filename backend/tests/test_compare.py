from pathlib import Path
import pymupdf
from backend.app.processors.compare import CompareProcessor
from backend.app.core.validation import validate_pdf_output


def test_compare_pdf_generates_differential_report(tmp_path):
    """INVARIANT: Compares 2 PDF documents and outputs a valid comparison report PDF."""
    # Doc A
    doc_a = pymupdf.open()
    page_a = doc_a.new_page()
    page_a.insert_text((50, 72), "PDFBolt Agreement Version 1", fontsize=14)
    page_a.insert_text((50, 100), "Term: 12 months", fontsize=12)
    path_a = tmp_path / "doc_a.pdf"
    doc_a.save(str(path_a))
    doc_a.close()

    # Doc B
    doc_b = pymupdf.open()
    page_b = doc_b.new_page()
    page_b.insert_text((50, 72), "PDFBolt Agreement Version 2", fontsize=14)
    page_b.insert_text((50, 100), "Term: 24 months (Extended)", fontsize=12)
    path_b = tmp_path / "doc_b.pdf"
    doc_b.save(str(path_b))
    doc_b.close()

    processor = CompareProcessor(job_id="test_compare_job", work_dir=tmp_path)
    result = processor.run([path_a, path_b], {})

    assert result.status == "COMPLETED"
    page_count = validate_pdf_output(result.output_path)
    assert page_count >= 1
