from pathlib import Path
import pymupdf
import pytest

from backend.app.processors.redact import RedactProcessor, SensitiveDataDetector, RedactionVerificationEngine
from backend.app.core.validation import validate_pdf_output


def create_sample_sensitive_pdf(path: Path) -> Path:
    doc = pymupdf.open()
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((50, 72), "CONFIDENTIAL FINANCIAL DOCUMENT", fontsize=16)
    p1.insert_text((50, 110), "Account Holder: Rahul Sharma", fontsize=12)
    p1.insert_text((50, 140), "PAN Number: ABCDE1234F", fontsize=12)
    p1.insert_text((50, 170), "Aadhaar Card: 2345 6789 0123", fontsize=12)
    p1.insert_text((50, 200), "Mobile Number: +91 9876543210", fontsize=12)
    p1.insert_text((50, 230), "IFSC Code: SBIN0001234", fontsize=12)
    p1.insert_text((50, 260), "UPI ID: rsharma@okhdfcbank", fontsize=12)
    p1.insert_text((50, 290), "Email Address: rahul.sharma@example.com", fontsize=12)
    
    p2 = doc.new_page(width=595, height=842)
    p2.insert_text((50, 72), "PAGE 2 STATEMENT", fontsize=16)
    p2.insert_text((50, 110), "Credit Card: 4532 1234 5678 9012", fontsize=12)
    p2.insert_text((50, 140), "Secondary Email: contact@financehub.in", fontsize=12)
    
    doc.save(str(path))
    doc.close()
    return path


def test_sensitive_data_detector_patterns(tmp_path):
    """Test deterministic pattern detector on Indian & universal PII."""
    sample_pdf = tmp_path / "sensitive.pdf"
    create_sample_sensitive_pdf(sample_pdf)

    processor = RedactProcessor(job_id="test_detect", work_dir=tmp_path)
    findings = processor.scan_document(sample_pdf, custom_terms=["Rahul Sharma"])

    types_found = {f["type"] for f in findings}
    assert "PAN" in types_found
    assert "AADHAAR" in types_found
    assert "PHONE_IN" in types_found
    assert "IFSC" in types_found
    assert "UPI" in types_found
    assert "EMAIL" in types_found
    assert "CREDIT_CARD" in types_found
    assert "CUSTOM_QUERY" in types_found

    # Verify masked format protects raw PII
    for f in findings:
        assert "*" in f["masked"]
        assert len(f["rects"]) > 0


def test_true_redaction_purges_underlying_text_vectors(tmp_path):
    """Test that true redaction completely removes underlying text glyphs."""
    sample_pdf = tmp_path / "sensitive_to_redact.pdf"
    create_sample_sensitive_pdf(sample_pdf)

    processor = RedactProcessor(job_id="test_true_redact", work_dir=tmp_path)
    result = processor.run(
        [sample_pdf],
        {
            "terms": [
                "ABCDE1234F",
                "2345 6789 0123",
                "+91 9876543210",
                "rsharma@okhdfcbank",
                "rahul.sharma@example.com"
            ]
        }
    )

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 2

    # Re-open and inspect extracted text
    doc = pymupdf.open(str(result.output_path))
    p1_text = doc[0].get_text()
    
    # Assert sensitive values are 100% missing
    assert "ABCDE1234F" not in p1_text
    assert "2345 6789 0123" not in p1_text
    assert "+91 9876543210" not in p1_text
    assert "rsharma@okhdfcbank" not in p1_text
    assert "rahul.sharma@example.com" not in p1_text
    
    # Assert non-redacted text is intact
    assert "CONFIDENTIAL FINANCIAL DOCUMENT" in p1_text
    assert "Account Holder: Rahul Sharma" in p1_text
    
    # Verify metadata is cleared
    meta = doc.metadata
    assert meta.get("author") == ""
    assert meta.get("title") == ""

    doc.close()


def test_find_and_redact_custom_keyword(tmp_path):
    """Test finding and redacting all occurrences of a custom keyword."""
    sample_pdf = tmp_path / "custom_find.pdf"
    create_sample_sensitive_pdf(sample_pdf)

    processor = RedactProcessor(job_id="test_custom_find", work_dir=tmp_path)
    result = processor.run([sample_pdf], {"terms": ["Rahul Sharma"]})

    assert result.status == "COMPLETED"
    doc = pymupdf.open(str(result.output_path))
    assert "Rahul Sharma" not in doc[0].get_text()
    doc.close()
