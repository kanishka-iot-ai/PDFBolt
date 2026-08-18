import zipfile
from pathlib import Path
from backend.app.processors.pdf_to_images import PdfToImagesProcessor
from backend.app.core.validation import validate_zip_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_pdf_to_images_zip_count_invariant(tmp_path):
    """INVARIANT: multi-page PDF generates ZIP archive containing all page images."""
    p_multi = FIXTURES_DIR / "multipage.pdf"
    processor = PdfToImagesProcessor(job_id="test_img_inv", work_dir=tmp_path)
    result = processor.run([p_multi], {"format": "png", "dpi": 150})

    assert result.status == "COMPLETED"
    validate_zip_output(result.output_path)

    with zipfile.ZipFile(result.output_path) as z:
        assert len(z.namelist()) == 5
