from pathlib import Path
from PIL import Image
from backend.app.processors.images_to_pdf import ImagesToPdfProcessor
from backend.app.core.validation import validate_pdf_output


def test_images_to_pdf_count_invariant(tmp_path):
    """INVARIANT: 3 input images produce a single PDF with exactly 3 pages."""
    img_paths = []
    for i in range(3):
        p = tmp_path / f"test_img_{i}.png"
        img = Image.new("RGB", (200, 200), color=(50 * i, 100, 150))
        img.save(p)
        img_paths.append(p)

    processor = ImagesToPdfProcessor(job_id="test_i2p_inv", work_dir=tmp_path)
    result = processor.run(img_paths, {"page_size": "A4"})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 3
