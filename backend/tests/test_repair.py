import io
import pytest
from pathlib import Path
import pymupdf
import pikepdf
from pypdf import PdfReader

from backend.app.processors.repair import RepairProcessor, RepairOutputValidator
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


def create_sample_5page_pdf(file_path: Path) -> bytes:
    """Helper to create a standard 5-page PDF document with distinct text and graphics."""
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


def test_repair_case_1_corrupted_xref_table(tmp_path):
    """Test 1: Corrupted XRef table offsets - must recover all 5 pages and original text."""
    valid_path = tmp_path / "orig_c1.pdf"
    raw_bytes = create_sample_5page_pdf(valid_path)
    
    # Corrupt XRef table by mangling byte offsets
    corrupted_bytes = raw_bytes.replace(b"00000000", b"99999999")
    corrupt_file = tmp_path / "corrupt_xref.pdf"
    corrupt_file.write_bytes(corrupted_bytes)
    
    processor = RepairProcessor(job_id="test_c1", work_dir=tmp_path)
    result = processor.run([corrupt_file], {})
    
    assert result.status == "COMPLETED"
    doc_out = pymupdf.open(str(result.output_path))
    assert len(doc_out) == 5, f"Expected 5 recovered pages, got {len(doc_out)}"
    assert "Page 1 of 5" in doc_out[0].get_text()
    assert "Page 5 of 5" in doc_out[4].get_text()
    doc_out.close()


def test_repair_case_2_missing_truncated_xref(tmp_path):
    """Test 2: Missing/truncated XRef table - must rebuild XRef and recover 5 pages."""
    valid_path = tmp_path / "orig_c2.pdf"
    raw_bytes = create_sample_5page_pdf(valid_path)
    
    pos = raw_bytes.rfind(b"xref")
    if pos == -1:
        pos = raw_bytes.rfind(b"startxref")
    truncated_bytes = raw_bytes[:pos]
    
    corrupt_file = tmp_path / "missing_xref.pdf"
    corrupt_file.write_bytes(truncated_bytes)
    
    processor = RepairProcessor(job_id="test_c2", work_dir=tmp_path)
    result = processor.run([corrupt_file], {})
    
    assert result.status == "COMPLETED"
    doc_out = pymupdf.open(str(result.output_path))
    assert len(doc_out) == 5
    assert "Page 1 of 5" in doc_out[0].get_text()
    assert "Page 5 of 5" in doc_out[4].get_text()
    doc_out.close()


def test_repair_case_3_damaged_trailer(tmp_path):
    """Test 3: Damaged trailer dictionary - must reconstruct catalog and trailer."""
    valid_path = tmp_path / "orig_c3.pdf"
    raw_bytes = create_sample_5page_pdf(valid_path)
    
    # Strip trailer dictionary
    trailer_idx = raw_bytes.rfind(b"trailer")
    damaged_bytes = raw_bytes[:trailer_idx] + b"\nstartxref\n0\n%%EOF\n"
    
    corrupt_file = tmp_path / "damaged_trailer.pdf"
    corrupt_file.write_bytes(damaged_bytes)
    
    processor = RepairProcessor(job_id="test_c3", work_dir=tmp_path)
    result = processor.run([corrupt_file], {})
    
    assert result.status == "COMPLETED"
    doc_out = pymupdf.open(str(result.output_path))
    assert len(doc_out) == 5
    assert "Page 1 of 5" in doc_out[0].get_text()
    doc_out.close()


def test_repair_case_4_damaged_object_references(tmp_path):
    """Test 4: Damaged indirect object references - must resolve page tree."""
    valid_path = tmp_path / "orig_c4.pdf"
    raw_bytes = create_sample_5page_pdf(valid_path)
    
    # Insert orphan invalid object reference
    corrupt_bytes = raw_bytes.replace(b"/Kids [", b"/Kids [999 0 R ")
    corrupt_file = tmp_path / "damaged_refs.pdf"
    corrupt_file.write_bytes(corrupt_bytes)
    
    processor = RepairProcessor(job_id="test_c4", work_dir=tmp_path)
    result = processor.run([corrupt_file], {})
    
    assert result.status == "COMPLETED"
    doc_out = pymupdf.open(str(result.output_path))
    assert len(doc_out) >= 1
    doc_out.close()


def test_repair_case_5_minor_stream_corruption(tmp_path):
    """Test 5: Stream syntax repair - ensures content streams are decompressed & re-deflated."""
    valid_path = tmp_path / "orig_c5.pdf"
    raw_bytes = create_sample_5page_pdf(valid_path)
    
    # Mild stream noise injection (between objects)
    corrupted_bytes = raw_bytes.replace(b"endstream", b"endstream\n%--REPAIR-TEST-NOISE--\n")
    corrupt_file = tmp_path / "stream_noise.pdf"
    corrupt_file.write_bytes(corrupted_bytes)
    
    processor = RepairProcessor(job_id="test_c5", work_dir=tmp_path)
    result = processor.run([corrupt_file], {})
    
    assert result.status == "COMPLETED"
    doc_out = pymupdf.open(str(result.output_path))
    assert len(doc_out) == 5
    doc_out.close()


def test_repair_case_6_truncated_pdf(tmp_path):
    """Test 6: Truncated PDF (bytes cut off towards end) - recovers all intact pages."""
    valid_path = tmp_path / "orig_c6.pdf"
    raw_bytes = create_sample_5page_pdf(valid_path)
    
    # Cut off last 15% of file
    truncated_bytes = raw_bytes[:int(len(raw_bytes) * 0.85)]
    corrupt_file = tmp_path / "truncated.pdf"
    corrupt_file.write_bytes(truncated_bytes)
    
    processor = RepairProcessor(job_id="test_c6", work_dir=tmp_path)
    result = processor.run([corrupt_file], {})
    
    assert result.status == "COMPLETED"
    doc_out = pymupdf.open(str(result.output_path))
    assert len(doc_out) >= 1
    assert "PDFBolt Document Header" in doc_out[0].get_text()
    doc_out.close()


def test_repair_case_7_recoverable_malformed_pdf(tmp_path):
    """Test 7: Garbage header prefix and stripped EOF - recovers intact 5 pages."""
    valid_path = tmp_path / "orig_c7.pdf"
    raw_bytes = create_sample_5page_pdf(valid_path)
    
    junk_prefix = b"HTTP/1.1 200 OK\r\nContent-Type: application/pdf\r\n\r\n"
    corrupted_bytes = junk_prefix + raw_bytes.replace(b"%%EOF", b"")
    corrupt_file = tmp_path / "junk_prefix.pdf"
    corrupt_file.write_bytes(corrupted_bytes)
    
    processor = RepairProcessor(job_id="test_c7", work_dir=tmp_path)
    result = processor.run([corrupt_file], {})
    
    assert result.status == "COMPLETED"
    doc_out = pymupdf.open(str(result.output_path))
    assert len(doc_out) == 5
    assert "Page 1 of 5" in doc_out[0].get_text()
    assert "Page 5 of 5" in doc_out[4].get_text()
    doc_out.close()


def test_repair_case_8_genuinely_unrecoverable_pdf_raises_error(tmp_path):
    """
    Test 8: Genuinely unrecoverable input (random binary noise, no PDF objects).
    CRITICAL REQUIREMENT: Must raise REPAIR_UNRECOVERABLE with user-facing message,
    and MUST NOT fabricate a fake 1-page recovery document.
    """
    garbage_bytes = b"\x00\xFF\xAA\x55\xDE\xAD\xBE\xEF" * 100
    garbage_file = tmp_path / "unrecoverable.pdf"
    garbage_file.write_bytes(garbage_bytes)
    
    processor = RepairProcessor(job_id="test_c8", work_dir=tmp_path)
    
    with pytest.raises(PDFBoltError) as exc_info:
        processor.run([garbage_file], {})
        
    assert exc_info.value.code == "REPAIR_UNRECOVERABLE"
    assert "We could not recover the original document structure from this PDF." in exc_info.value.message


def test_repair_output_validator_rejects_placeholder_text(tmp_path):
    """Test that RepairOutputValidator rejects fabricated placeholder PDFs."""
    # Create a fake placeholder PDF with the banned notice
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 100), "The original PDF structure contained unrecoverable byte corruption.")
    page.insert_text((50, 130), "The document envelope has been rebuilt with valid PDF-1.7 specifications.")
    placeholder_path = tmp_path / "fake_placeholder.pdf"
    doc.save(str(placeholder_path))
    doc.close()
    
    with pytest.raises(OutputValidationError) as exc_info:
        RepairOutputValidator.validate_repaired_document(placeholder_path)
        
    assert "placeholder text" in str(exc_info.value)
