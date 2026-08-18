from pathlib import Path
from backend.app.processors.rotate import RotateProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_rotate_page_count_invariant(tmp_path):
    """INVARIANT: rotating pages preserves exact page count."""
    p_multi = FIXTURES_DIR / "multipage.pdf"
    processor = RotateProcessor(job_id="test_rot_inv", work_dir=tmp_path)
    result = processor.run([p_multi], {"angle": 90, "pages": "all"})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 5
