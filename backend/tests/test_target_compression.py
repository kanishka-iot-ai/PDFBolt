import io
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.processors.compress import (
    CompressProcessor,
    PDFCompressionEngine,
    GOVERNMENT_PRESETS,
    PRESETS,
    compress_by_preset
)

client = TestClient(app)
FIXTURES = Path(__file__).parent / "fixtures"


def test_government_presets_defined():
    assert PRESETS["UPSC"] == 300
    assert PRESETS["SSC"] == 50
    assert PRESETS["RRB_Railway"] == 100
    assert PRESETS["JEE_Main"] == 300
    assert PRESETS["NEET_UG"] == 300
    assert PRESETS["IBPS"] == 100
    assert GOVERNMENT_PRESETS["UPSC_Signature"] == 20
    assert GOVERNMENT_PRESETS["SSC_Signature"] == 20
    assert GOVERNMENT_PRESETS["UPSC_Photo"] == 50
    assert GOVERNMENT_PRESETS["SSC_Photo"] == 50


def test_engine_compress_pdf_staticmethod(tmp_path):
    input_file = FIXTURES / "image_heavy.pdf"
    output_file = tmp_path / "out_static_50kb.pdf"

    success = PDFCompressionEngine.compress_pdf(str(input_file), str(output_file), target_kb=50)

    assert output_file.exists()
    assert output_file.stat().st_size > 0
    assert output_file.stat().st_size <= 50 * 1024
    assert success is True


def test_compress_by_preset(tmp_path):
    input_file = FIXTURES / "image_heavy.pdf"
    output_file = tmp_path / "out_preset_ssc.pdf"

    success = compress_by_preset(str(input_file), str(output_file), "SSC")

    assert output_file.exists()
    assert output_file.stat().st_size > 0
    assert output_file.stat().st_size <= 50 * 1024
    assert success is True


def test_engine_compress_to_target_50kb(tmp_path):
    input_file = FIXTURES / "image_heavy.pdf"
    output_file = tmp_path / "out_50kb.pdf"

    engine = PDFCompressionEngine(str(input_file))
    success, final_kb = engine.compress_to_target_kb(str(output_file), target_kb=50)

    assert output_file.exists()
    assert output_file.stat().st_size > 0
    assert output_file.stat().st_size <= 50 * 1024
    assert success is True


def test_engine_compress_to_target_20kb(tmp_path):
    input_file = FIXTURES / "image_heavy.pdf"
    output_file = tmp_path / "out_20kb.pdf"

    engine = PDFCompressionEngine(str(input_file))
    success, final_kb = engine.compress_to_target_kb(str(output_file), target_kb=20)

    assert output_file.exists()
    assert output_file.stat().st_size > 0
    assert output_file.stat().st_size <= 20 * 1024
    assert success is True


def test_compress_processor_with_target_kb(tmp_path):
    input_file = FIXTURES / "large.pdf"

    processor = CompressProcessor(
        job_id="test_target_kb",
        work_dir=tmp_path
    )

    result = processor.run([input_file], {"target_kb": 100})
    assert result.status == "COMPLETED"
    assert result.output_path.exists()
    assert result.output_path.stat().st_size <= 100 * 1024


def test_api_jobs_target_kb_compression():
    input_file = FIXTURES / "image_heavy.pdf"
    with open(input_file, "rb") as f:
        response = client.post(
            "/api/v1/jobs",
            data={
                "operation": "compress",
                "settings": '{"target_kb": 50, "preset": "SSC_Photo"}'
            },
            files={"file": ("test.pdf", f, "application/pdf")}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["operation"] == "compress"
    assert "metrics" in data
    assert data["metrics"]["output_size_bytes"] <= 50 * 1024
    assert data["metrics"]["target_kb"] == 50
    assert data["metrics"]["target_achieved"] is True
