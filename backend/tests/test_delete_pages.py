from pathlib import Path
from backend.app.processors.delete_pages import DeletePagesProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_delete_pages_count_invariant(tmp_path):
    """INVARIANT: 10 - 3 deleted pages == 7 remaining pages."""
    p10 = FIXTURES_DIR / "10page.pdf"
    processor = DeletePagesProcessor(job_id="test_del_inv", work_dir=tmp_path)
    result = processor.run([p10], {"pages": [2, 5, 8]})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 7
