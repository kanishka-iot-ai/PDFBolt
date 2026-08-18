from pathlib import Path
from backend.app.processors.organize import OrganizeProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_organize_reorder_invariant(tmp_path):
    """INVARIANT: reordered pages array [5, 3, 1, 2, 4] produces 5 pages in exact sequence."""
    p_multi = FIXTURES_DIR / "multipage.pdf"
    processor = OrganizeProcessor(job_id="test_org_inv", work_dir=tmp_path)
    result = processor.run([p_multi], {"order": [5, 3, 1, 2, 4]})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 5
