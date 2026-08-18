from pathlib import Path
from backend.app.processors.page_numbers import PageNumbersProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_page_numbers_count_invariant(tmp_path):
    """INVARIANT: applying page numbers keeps exact page count."""
    p_multi = FIXTURES_DIR / "multipage.pdf"
    processor = PageNumbersProcessor(job_id="test_pn_inv", work_dir=tmp_path)
    result = processor.run([p_multi], {"start_number": 1, "position": "bottom-center"})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 5
