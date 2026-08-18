from pathlib import Path
from backend.app.processors.repair import RepairProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_repair_heals_stream_invariant(tmp_path):
    """INVARIANT: repair recovers readable valid PDF output."""
    p1 = FIXTURES_DIR / "1page_text.pdf"
    processor = RepairProcessor(job_id="test_rep_inv", work_dir=tmp_path)
    result = processor.run([p1], {})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 1
