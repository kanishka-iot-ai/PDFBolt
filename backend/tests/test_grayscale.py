import io
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.processors.grayscale import GrayscaleProcessor
from backend.app.core.validation import validate_pdf_output

client = TestClient(app)
FIXTURES = Path(__file__).parent / "fixtures"


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
    assert out_name.endswith("_grayscale.pdf")
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
