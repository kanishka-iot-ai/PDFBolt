import io
from pathlib import Path
import pymupdf
import pikepdf
from pypdf import PdfReader

from backend.app.processors.repair import RepairProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def create_sample_5page_pdf(file_path: Path) -> bytes:
    """Helper to create a standard 5-page PDF document with distinct content."""
    doc = pymupdf.open()
    for i in range(1, 6):
        page = doc.new_page(width=595, height=842)
        page.insert_text((50, 72), f"PDFBolt Document Header - Page {i} of 5", fontsize=16)
        page.insert_text((50, 110), f"This is authentic text content for page {i}.", fontsize=12)
        page.insert_text((50, 140), f"Section {i}: Key performance metrics and statistics.", fontsize=11)
        page.draw_rect(pymupdf.Rect(50, 200, 500, 350), color=(0.2, 0.4, 0.7), fill=(0.95, 0.97, 1.0))
        page.insert_text((70, 240), f"Exhibit Table Block [Page {i}]", fontsize=13)
        page.insert_text((70, 270), f"Metric: {i * 5000} items | Margin: {i * 12.5}%", fontsize=11)
    
    raw_bytes = doc.tobytes()
    doc.close()
    with open(file_path, "wb") as f:
        f.write(raw_bytes)
    return raw_bytes


def test_repair_valid_pdf(tmp_path):
    """Test repair on standard valid PDF."""
    p1 = tmp_path / "valid.pdf"
    create_sample_5page_pdf(p1)
    
    processor = RepairProcessor(job_id="test_valid", work_dir=tmp_path)
    result = processor.run([p1], {})
    
    assert result.status == "COMPLETED"
    assert result.output_path.exists()
    assert validate_pdf_output(result.output_path) == 5
    assert processor.metrics["status"] == "repaired"
    assert processor.metrics["recovered_pages"] == 5
    assert processor.metrics["pages_lost"] == 0
    assert processor.metrics["repair_score"] >= 90


def test_repair_truncated_xref_and_trailer_5page_document(tmp_path):
    """
    CRITICAL INVARIANT TEST:
    Given a 5-page PDF whose xref, trailer, and EOF have been completely cut off,
    the repair engine must recover all 5 pages, authentic text, and correct page tree.
    """
    valid_path = tmp_path / "orig.pdf"
    raw_bytes = create_sample_5page_pdf(valid_path)
    
    # Truncate at xref/trailer
    pos = raw_bytes.rfind(b"xref")
    if pos == -1:
        pos = raw_bytes.rfind(b"startxref")
    truncated_bytes = raw_bytes[:pos]
    
    corrupted_file = tmp_path / "pdfbolt_broken_test.pdf"
    with open(corrupted_file, "wb") as f:
        f.write(truncated_bytes)
        
    processor = RepairProcessor(job_id="test_5page_broken", work_dir=tmp_path)
    result = processor.run([corrupted_file], {})
    
    assert result.status == "COMPLETED"
    assert result.output_path.exists()
    
    # Verify recovered document page count is exactly 5 (NOT 3, NOT 1)
    doc_out = pymupdf.open(str(result.output_path))
    assert len(doc_out) == 5, f"Expected 5 pages, got {len(doc_out)}"
    
    # Verify text preservation on first and last page
    p1_text = doc_out[0].get_text()
    p5_text = doc_out[4].get_text()
    assert "Page 1 of 5" in p1_text
    assert "Page 5 of 5" in p5_text
    
    # Verify that raw PDF keywords do NOT appear as visible page text
    assert "/MediaBox" not in p1_text
    assert "/Type /Page" not in p1_text
    assert "10 0 obj" not in p1_text
    
    doc_out.close()
    
    # Verify quality metrics
    metrics = processor.metrics
    assert metrics["recovered_pages"] == 5
    assert metrics["original_pages"] == 5
    assert metrics["pages_lost"] == 0
    assert metrics["status"] == "repaired"
    assert metrics["repair_score"] >= 85


def test_repair_missing_eof_and_junk_prefix(tmp_path):
    """Test recovery when PDF has HTTP junk prefix and missing EOF."""
    valid_path = tmp_path / "valid2.pdf"
    raw_bytes = create_sample_5page_pdf(valid_path)
    
    # Add junk header and strip EOF
    junk_prefix = b"HTTP/1.1 200 OK\r\nServer: Apache\r\n\r\n"
    corrupted_bytes = junk_prefix + raw_bytes.replace(b"%%EOF", b"")
    
    corrupted_file = tmp_path / "junk_header.pdf"
    with open(corrupted_file, "wb") as f:
        f.write(corrupted_bytes)
        
    processor = RepairProcessor(job_id="test_junk_header", work_dir=tmp_path)
    result = processor.run([corrupted_file], {})
    
    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 5
    assert processor.metrics["recovered_pages"] == 5
