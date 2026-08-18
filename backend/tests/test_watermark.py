from pathlib import Path
from backend.app.processors.watermark import WatermarkProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_watermark_preserves_page_count_invariant(tmp_path):
    """INVARIANT: applying watermark preserves exact document page count."""
    p_multi = FIXTURES_DIR / "multipage.pdf"
    processor = WatermarkProcessor(job_id="test_wm_inv", work_dir=tmp_path)
    result = processor.run([p_multi], {"text": "CONFIDENTIAL", "opacity": 0.4})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 5
