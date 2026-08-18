import pytest
from pathlib import Path
from backend.app.core.errors import PDFBoltError
from backend.app.core.security import check_path_traversal, validate_file_size, validate_magic_bytes
from backend.app.core.validation import validate_pdf_file


def test_path_traversal_blocked():
    """SECURITY: path traversal filename must be rejected."""
    with pytest.raises(PDFBoltError) as exc:
        check_path_traversal("../../etc/passwd")
    assert exc.value.code == "PATH_TRAVERSAL"


def test_malicious_extension_blocked():
    """SECURITY: executable script extensions must be rejected."""
    with pytest.raises(PDFBoltError) as exc:
        check_path_traversal("malicious_script.sh")
    assert exc.value.code == "MALICIOUS_FILENAME"


def test_empty_file_rejected():
    """SECURITY: zero byte file must be rejected."""
    with pytest.raises(PDFBoltError) as exc:
        validate_file_size(0, 100 * 1024 * 1024)
    assert exc.value.code == "FILE_EMPTY"


def test_invalid_magic_bytes_rejected(tmp_path):
    """SECURITY: fake PDF with non-PDF headers must be rejected."""
    fake_pdf = tmp_path / "fake.pdf"
    with open(fake_pdf, "wb") as f:
        f.write(b"NOT_A_PDF_HEADER_DATA")

    with pytest.raises(PDFBoltError) as exc:
        validate_magic_bytes(fake_pdf, "application/pdf")
    assert exc.value.code == "INVALID_MAGIC_BYTES"
