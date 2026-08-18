from pathlib import Path
from backend.app.processors.split import SplitProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_split_range_invariant(tmp_path):
    """INVARIANT: split '1-3' from 10-page PDF == 3 pages."""
    p10 = FIXTURES_DIR / "10page.pdf"
    processor = SplitProcessor(job_id="test_split_inv", work_dir=tmp_path)
    result = processor.run([p10], {"ranges": "1-3"})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 3


def test_split_mixed_ranges(tmp_path):
    """INVARIANT: split '1, 4-6, 9' == 5 pages."""
    p10 = FIXTURES_DIR / "10page.pdf"
    processor = SplitProcessor(job_id="test_split_mix", work_dir=tmp_path)
    result = processor.run([p10], {"ranges": "1, 4-6, 9"})

    assert validate_pdf_output(result.output_path) == 5
