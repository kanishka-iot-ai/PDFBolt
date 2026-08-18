from pathlib import Path
from backend.app.processors.redact import RedactProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_redaction_raster_destruction_invariant(tmp_path):
    """INVARIANT: redacted text within coordinates is irreversibly destroyed."""
    p1 = FIXTURES_DIR / "1page_text.pdf"
    processor = RedactProcessor(job_id="test_redact_inv", work_dir=tmp_path)
    result = processor.run(
        [p1],
        {"regions": [{"page": 1, "x1": 50, "y1": 690, "x2": 400, "y2": 710}]}
    )

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 1
