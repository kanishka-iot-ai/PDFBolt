import pytest
from backend.app.validators.input_validator import InputValidator
from backend.app.core.errors import PDFProcessingException, ErrorCode
from backend.app.core.security import sanitize_filename


def test_magic_byte_sniffing(tiny_pdf_bytes):
    assert InputValidator.sniff_magic_bytes(tiny_pdf_bytes) == "pdf"
    assert InputValidator.sniff_magic_bytes(b"\x89PNG\r\n\x1a\n123") == "png"
    assert InputValidator.sniff_magic_bytes(b"\xff\xd8\xff123") == "jpeg"
    assert InputValidator.sniff_magic_bytes(b"PK\x03\x04123") == "zip"
    assert InputValidator.sniff_magic_bytes(b"HELLO_WORLD") == "unknown"


def test_empty_file_rejected():
    with pytest.raises(PDFProcessingException) as exc_info:
        InputValidator.validate_file_size(b"")
    assert exc_info.value.error_code == ErrorCode.FILE_EMPTY


def test_file_size_limit_exceeded():
    large_payload = b"X" * (100 * 1024 * 1024 + 1)
    with pytest.raises(PDFProcessingException) as exc_info:
        InputValidator.validate_file_size(large_payload, max_bytes=100 * 1024 * 1024)
    assert exc_info.value.error_code == ErrorCode.FILE_TOO_LARGE


def test_malformed_pdf_rejected(malformed_pdf_bytes):
    with pytest.raises(PDFProcessingException) as exc_info:
        InputValidator.validate_pdf_structure(malformed_pdf_bytes)
    assert exc_info.value.error_code == ErrorCode.CORRUPTED_PDF_STRUCTURE


def test_filename_sanitization():
    assert sanitize_filename("../../../etc/passwd.pdf") == "passwd.pdf"
    assert sanitize_filename("CON.pdf") == "doc_CON.pdf"
    assert sanitize_filename("report<script>alert(1)</script>.pdf") == "report_script_alert(1)__script_.pdf"
    assert sanitize_filename("safe_document.pdf") == "safe_document.pdf"
