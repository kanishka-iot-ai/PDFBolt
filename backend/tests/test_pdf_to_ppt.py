from pathlib import Path
from pptx import Presentation
from backend.app.processors.pdf_to_ppt import PdfToPptProcessor
from backend.app.core.validation import validate_pptx_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_pdf_to_ppt_slide_count_invariant(tmp_path):
    """INVARIANT: PPTX opens, passes zip check, and slide_count == input_page_count."""
    p_multi = FIXTURES_DIR / "multipage.pdf"
    processor = PdfToPptProcessor(job_id="test_ppt_inv", work_dir=tmp_path)
    result = processor.run([p_multi], {})

    assert result.status == "COMPLETED"
    validate_pptx_output(result.output_path)

    prs = Presentation(str(result.output_path))
    assert len(prs.slides) == 5
