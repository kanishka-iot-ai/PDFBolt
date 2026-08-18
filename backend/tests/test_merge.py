from pathlib import Path
from backend.app.processors.merge import MergeProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_merge_page_count_invariant(tmp_path):
    """INVARIANT: output pages == sum of all input pages (3 + 5 = 8)."""
    p3 = FIXTURES_DIR / "3page.pdf"
    p5 = FIXTURES_DIR / "multipage.pdf"

    processor = MergeProcessor(job_id="test_merge_inv", work_dir=tmp_path)
    result = processor.run([p3, p5], {})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 8
