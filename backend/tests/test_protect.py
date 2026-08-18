import pytest
from pathlib import Path
from pypdf import PdfReader
from backend.app.processors.protect import ProtectProcessor

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_protect_requires_password_invariant(tmp_path):
    """INVARIANT: protected PDF cannot be decrypted/opened without password."""
    p1 = FIXTURES_DIR / "1page_text.pdf"
    processor = ProtectProcessor(job_id="test_prot_inv", work_dir=tmp_path)
    result = processor.run([p1], {"password": "secret123"})

    assert result.status == "COMPLETED"
    
    # Opening without password must report encrypted
    reader = PdfReader(str(result.output_path), strict=False)
    assert reader.is_encrypted is True
    
    # Decrypting with correct password must succeed
    assert reader.decrypt("secret123") > 0
