import io
from pathlib import Path
from fastapi.testclient import TestClient
from PIL import Image
import pymupdf

from backend.app.main import app
from backend.app.processors.grayscale import GrayscaleProcessor, convert_pdf_to_bw
from backend.app.core.validation import validate_pdf_output

client = TestClient(app)
FIXTURES = Path(__file__).parent / "fixtures"


def test_convert_pdf_with_embedded_photos(tmp_path):
    # Create test document with photo image and vector shapes
    test_pdf = tmp_path / "photo_doc.pdf"
    doc = pymupdf.open()
    page = doc.new_page(width=400, height=400)

    # Insert color photo
    photo = Image.new("RGB", (150, 150), color=(255, 80, 20))
    photo_io = io.BytesIO()
    photo.save(photo_io, format="JPEG")
    page.insert_image(pymupdf.Rect(50, 50, 200, 200), stream=photo_io.getvalue())
    page.insert_text((50, 250), "Certificate Photo Verification", color=(0, 0, 1), fontsize=14)
    doc.save(str(test_pdf))
    doc.close()

    output_pdf = tmp_path / "bw_photo_doc.pdf"
    success = convert_pdf_to_bw(str(test_pdf), str(output_pdf))

    assert success is True
    assert output_pdf.exists()

    # Verify that the embedded photo was updated to grayscale colorspace (n=1)
    res_doc = pymupdf.open(str(output_pdf))
    img_list = res_doc[0].get_images(full=True)
    assert len(img_list) > 0
    xref = img_list[0][0]
    pix = pymupdf.Pixmap(res_doc, xref)
    assert pix.colorspace.n == 1
    res_doc.close()


def test_convert_pdf_to_bw_direct(tmp_path):
    input_file = FIXTURES / "image_heavy.pdf"
    output_file = tmp_path / "out_vector_bw.pdf"

    success = convert_pdf_to_bw(str(input_file), str(output_file))

    assert success is True
    assert output_file.exists()
    assert output_file.stat().st_size > 0
    pages = validate_pdf_output(output_file)
    assert pages > 0


def test_grayscale_processor_basic(tmp_path):
    input_file = FIXTURES / "1page_text.pdf"
    processor = GrayscaleProcessor(job_id="test_gray_basic", work_dir=tmp_path)
    result = processor.run([input_file], {"mode": "grayscale"})

    assert result.status == "COMPLETED"
    assert result.output_path.exists()
    assert result.output_path.stat().st_size > 0
    pages = validate_pdf_output(result.output_path)
    assert pages > 0


def test_grayscale_processor_monochrome(tmp_path):
    input_file = FIXTURES / "image_heavy.pdf"
    processor = GrayscaleProcessor(job_id="test_mono_heavy", work_dir=tmp_path)
    result = processor.run([input_file], {"mode": "monochrome", "dpi": 150})

    assert result.status == "COMPLETED"
    assert result.output_path.exists()
    assert result.output_path.stat().st_size > 0
    pages = validate_pdf_output(result.output_path)
    assert pages > 0


def test_grayscale_processor_process_bytes():
    input_file = FIXTURES / "image_heavy.pdf"
    with open(input_file, "rb") as f:
        content = f.read()

    processor = GrayscaleProcessor(job_id="test_bytes_gray")
    out_bytes, out_name, metrics = processor.process_bytes(content, "document.pdf")

    assert len(out_bytes) > 0
    assert out_name.endswith((".pdf"))
    assert metrics["quality_status"] == "passed"


def test_api_jobs_grayscale():
    input_file = FIXTURES / "1page_text.pdf"
    with open(input_file, "rb") as f:
        response = client.post(
            "/api/v1/jobs",
            data={
                "operation": "grayscale",
                "settings": '{"mode": "grayscale", "dpi": 150}'
            },
            files={"file": ("color.pdf", f, "application/pdf")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["operation"] == "grayscale"
    assert data["status"] in ("COMPLETED", "completed")
    assert data["download_url"].startswith("/api/v1/jobs/")


def test_api_jobs_color_to_bw():
    input_file = FIXTURES / "image_heavy.pdf"
    with open(input_file, "rb") as f:
        response = client.post(
            "/api/v1/jobs",
            data={
                "operation": "color-to-bw",
                "settings": '{"mode": "monochrome"}'
            },
            files={"file": ("color.pdf", f, "application/pdf")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
