from pathlib import Path
import pymupdf
import pytest

from backend.app.processors.redact import RedactProcessor, SensitiveDataDetector, RedactionVerificationEngine
from backend.app.core.validation import validate_pdf_output


def create_comprehensive_benchmark_pdf(path: Path) -> Path:
    """Builds the 3-page synthetic benchmark test document."""
    doc = pymupdf.open()
    
    # Page 1: Sensitive Data Detection Matrix
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((50, 50), "PDFBolt — Comprehensive Redaction & Sensitive Data Detection Test", fontsize=14)
    p1.insert_text((50, 75), "1. Sensitive Data Detection Matrix", fontsize=12)
    
    matrix_data = [
        ("Full Name", "Kanishka Giri", "PERSON"),
        ("Email", "kanishka.redact@example.com", "EMAIL"),
        ("Indian Mobile", "+91 98765 43210", "PHONE"),
        ("Alternate Mobile", "09876543210", "PHONE"),
        ("PAN", "ABCDE1234F", "PAN"),
        ("Aadhaar-style", "4821 7356 1904", "AADHAAR"),
        ("Bank Account", "123456789012", "BANK ACCOUNT"),
        ("IFSC", "SBIN0001234", "IFSC"),
        ("UPI ID", "kanishka.redact@upi", "UPI"),
        ("Debit Card-style", "5123 4567 8901 2345", "CARD"),
        ("Credit Card-style", "4111 1111 1111 1111", "CARD"),
        ("CVV-style", "482", "CVV"),
        ("Expiry", "09/29", "CARD EXPIRY"),
        ("Passport-style", "P1234567", "PASSPORT"),
        ("Driving Licence-style", "PB-01-2026-1234567", "DRIVING LICENCE"),
        ("GSTIN", "27ABCDE1234F1Z5", "GSTIN"),
        ("Date of Birth", "25/05/2006", "DATE"),
        ("Address", "42 Example Road, Kharar, Punjab 140301", "ADDRESS"),
        ("PIN Code", "140301", "POSTAL CODE"),
        ("Customer ID", "CUST-PDFBOLT-2026-001", "CUSTOM ID"),
        ("Invoice Number", "INV-2026-08-001927", "INVOICE"),
        ("Order Number", "ORD-PDF-987654", "ORDER ID"),
        ("Employee ID", "EMP-IND-004281", "EMPLOYEE ID"),
        ("Medical Record", "MRN-2026-001849", "MEDICAL ID"),
        ("Medical Information", "Diagnosis: TEST CONDITION; Medication: TEST MEDICINE", "MEDICAL")
    ]
    
    y = 100
    for cat, val, exp in matrix_data:
        p1.insert_text((50, y), f"{cat}: {val} (Expected: {exp})", fontsize=10)
        y += 26

    # Page 2: Banking & Sentences
    p2 = doc.new_page(width=595, height=842)
    p2.insert_text((50, 50), "2. Banking / Payment Information Test", fontsize=12)
    p2.insert_text((50, 80), "Account holder: Kanishka Giri", fontsize=10)
    p2.insert_text((50, 105), "UPI: kanishka.redact@upi", fontsize=10)
    p2.insert_text((50, 130), "Primary phone: +91 98765 43210", fontsize=10)
    p2.insert_text((50, 155), "Bank: PDFBolt Test Bank", fontsize=10)
    p2.insert_text((50, 180), "Account number: 123456789012", fontsize=10)
    p2.insert_text((50, 205), "IFSC: SBIN0001234", fontsize=10)
    p2.insert_text((50, 230), "Debit card: 5123 4567 8901 2345", fontsize=10)
    p2.insert_text((50, 255), "Credit card: 4111 1111 1111 1111", fontsize=10)
    p2.insert_text((50, 280), "Expiry: 09/29", fontsize=10)
    p2.insert_text((50, 305), "CVV: 482", fontsize=10)
    p2.insert_text((50, 330), "Transaction ID: TXN-PDFBOLT-20260822-001", fontsize=10)
    p2.insert_text((50, 355), "Reference: REF-784512963", fontsize=10)
    p2.insert_text((50, 395), "3. Repeated Sensitive Values", fontsize=12)
    p2.insert_text((50, 420), "Kanishka Giri used kanishka.redact@example.com and +91 98765 43210.", fontsize=10)
    p2.insert_text((50, 445), "The UPI ID kanishka.redact@upi was used for the test transaction.", fontsize=10)
    p2.insert_text((50, 470), "The account 123456789012 was associated with the test.", fontsize=10)

    # Page 3: Mixed & Difficult Detection Cases
    p3 = doc.new_page(width=595, height=842)
    p3.insert_text((50, 50), "5. Mixed / Difficult Detection Cases", fontsize=12)
    p3.insert_text((50, 80), "Contact: kanishka.redact@example.com; please verify.", fontsize=10)
    p3.insert_text((50, 105), "Call (+91) 98765-43210 immediately.", fontsize=10)
    p3.insert_text((50, 130), "Send the test amount to kanishka.redact@upi.", fontsize=10)
    p3.insert_text((50, 155), "PAN=ABCDE1234F; Status=TEST", fontsize=10)
    p3.insert_text((50, 180), "ID: 4821 7356 1904", fontsize=10)
    p3.insert_text((50, 205), "A/C No.: 123456789012", fontsize=10)
    p3.insert_text((50, 230), "IFSC Code: SBIN0001234", fontsize=10)
    p3.insert_text((50, 255), "Card: 5123 4567 8901 2345", fontsize=10)
    p3.insert_text((50, 280), "Card: 5123-4567-8901-2345", fontsize=10)
    p3.insert_text((50, 305), "Invoice INV-2026-08-001927", fontsize=10)
    p3.insert_text((50, 330), "Deliver to 42 Example Road, Kharar, Punjab 140301", fontsize=10)
    p3.insert_text((50, 355), "Patient MRN-2026-001849 — Diagnosis: TEST CONDITION", fontsize=10)

    doc.save(str(path))
    doc.close()
    return path


def test_sensitive_data_detection_benchmark_document(tmp_path):
    """Test deterministic detector against all 25 categories from benchmark document."""
    benchmark_pdf = tmp_path / "benchmark.pdf"
    create_comprehensive_benchmark_pdf(benchmark_pdf)

    processor = RedactProcessor(job_id="test_bench_detect", work_dir=tmp_path)
    findings = processor.scan_document(benchmark_pdf)

    types_found = {f["type"] for f in findings}
    
    # Assert every core category is identified
    assert "PERSON" in types_found
    assert "EMAIL" in types_found
    assert "PHONE" in types_found
    assert "PAN" in types_found
    assert "AADHAAR" in types_found
    assert "BANK_ACCOUNT" in types_found
    assert "IFSC" in types_found
    assert "UPI" in types_found
    assert "CARD" in types_found
    assert "CVV" in types_found
    assert "CARD_EXPIRY" in types_found
    assert "PASSPORT" in types_found
    assert "DRIVING_LICENCE" in types_found
    assert "GSTIN" in types_found
    assert "DATE" in types_found
    assert "POSTAL_CODE" in types_found
    assert "ADDRESS" in types_found
    assert "CUSTOM_ID" in types_found
    assert "MEDICAL" in types_found

    assert len(findings) >= 25


def test_one_click_auto_redact_all_benchmark_document(tmp_path):
    """Test 1-click auto_redact_all purges all sensitive values across all 3 pages."""
    benchmark_pdf = tmp_path / "benchmark_to_redact.pdf"
    create_comprehensive_benchmark_pdf(benchmark_pdf)

    processor = RedactProcessor(job_id="test_bench_redact", work_dir=tmp_path)
    result = processor.run([benchmark_pdf], {"auto_redact_all": True})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 3

    # Re-open and verify every single verification string is gone
    doc = pymupdf.open(str(result.output_path))
    full_text = " ".join([p.get_text() for p in doc])

    verification_strings = [
        "Kanishka Giri",
        "kanishka.redact@example.com",
        "+91 98765 43210",
        "09876543210",
        "ABCDE1234F",
        "4821 7356 1904",
        "123456789012",
        "SBIN0001234",
        "kanishka.redact@upi",
        "5123 4567 8901 2345",
        "4111 1111 1111 1111",
        "P1234567",
        "PB-01-2026-1234567",
        "27ABCDE1234F1Z5",
        "CUST-PDFBOLT-2026-001",
        "INV-2026-08-001927",
        "ORD-PDF-987654",
        "EMP-IND-004281",
        "MRN-2026-001849"
    ]

    for val in verification_strings:
        assert val not in full_text, f"Verification failed: '{val}' was not purged."

    doc.close()
