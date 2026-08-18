from pathlib import Path
from backend.app.processors.compress import CompressProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_compress_never_larger_invariant(tmp_path):
    """INVARIANT: output_size <= input_size and output_pages == input_pages."""
    p_large = FIXTURES_DIR / "large.pdf"
    input_size = p_large.stat().st_size

    processor = CompressProcessor(job_id="test_comp_inv", work_dir=tmp_path)
    result = processor.run([p_large], {"level": "HIGH"})

    assert result.status == "COMPLETED"
    output_size = result.output_path.stat().st_size
    assert output_size <= input_size
    assert validate_pdf_output(result.output_path) == 14
