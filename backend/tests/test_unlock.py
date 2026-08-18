from pathlib import Path
from pypdf import PdfReader
from backend.app.processors.unlock import UnlockProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_unlock_removes_encryption_invariant(tmp_path):
    """INVARIANT: unlocked PDF can be opened cleanly without password."""
    p_enc = FIXTURES_DIR / "encrypted.pdf"
    processor = UnlockProcessor(job_id="test_unl_inv", work_dir=tmp_path)
    result = processor.run([p_enc], {"password": "secret123"})

    assert result.status == "COMPLETED"
    
    reader = PdfReader(str(result.output_path), strict=False)
    assert reader.is_encrypted is False
    assert validate_pdf_output(result.output_path) == 1
