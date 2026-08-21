import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.storage_provider import get_storage_provider, LocalStorageProvider, GoogleCloudStorageProvider
from backend.app.models.iot_event import IoTEventType
from backend.app.models.schemas import JobStatus

client = TestClient(app)


def test_iot_device_lifecycle_and_security(tiny_pdf_bytes):
    # 1. Register IoT Scanner Device
    reg_payload = {
        "device_id": "scanner_hp_officejet_x99",
        "device_type": "scanner",
        "firmware_version": "2.4.1",
        "owner_id": "tenant_enterprise_01",
        "capabilities": ["scan", "compress", "ocr", "upload"],
        "metadata": {"model": "OfficeJet Enterprise X", "dpi": 600}
    }
    resp = client.post("/api/v1/devices", json=reg_payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["device_id"] == "scanner_hp_officejet_x99"
    assert data["status"] == "active"
    assert "api_token_preview" in data
    token = data["api_token_preview"]

    # 2. Get Device Details
    resp = client.get("/api/v1/devices/scanner_hp_officejet_x99")
    assert resp.status_code == 200
    assert resp.json()["firmware_version"] == "2.4.1"

    # 3. Device Heartbeat
    resp = client.get(
        "/api/v1/devices/scanner_hp_officejet_x99/status",
        headers={"X-Device-Token": token}
    )
    assert resp.status_code == 200
    assert resp.json()["ready"] is True

    # 4. Device Submits Scanned Document without Token -> 401 Unauthorized
    resp = client.post(
        "/api/v1/devices/scanner_hp_officejet_x99/jobs",
        files={"file": ("scan_001.pdf", tiny_pdf_bytes, "application/pdf")},
        data={"operation": "compress"}
    )
    assert resp.status_code == 401

    # 5. Device Submits Scanned Document with Valid Token -> 200 OK
    resp = client.post(
        "/api/v1/devices/scanner_hp_officejet_x99/jobs",
        headers={"X-Device-Token": token},
        files={"file": ("scan_001.pdf", tiny_pdf_bytes, "application/pdf")},
        data={"operation": "compress", "settings": '{"profile": "balanced"}'}
    )
    assert resp.status_code == 200
    job_data = resp.json()
    assert "job_id" in job_data
    assert job_data["status"] in (JobStatus.QUEUED, JobStatus.PROCESSING, JobStatus.COMPLETED, "QUEUED", "PROCESSING", "COMPLETED")

    # 6. Device Emits Telemetry Event
    event_payload = {
        "device_id": "scanner_hp_officejet_x99",
        "event_type": "DOCUMENT_CAPTURED",
        "job_id": job_data["job_id"],
        "payload": {"resolution": "300dpi", "color_mode": "RGB", "pages": 1}
    }
    resp = client.post(
        "/api/v1/devices/scanner_hp_officejet_x99/events",
        headers={"X-Device-Token": token},
        json=event_payload
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ingested"


def test_storage_provider_abstraction():
    provider = get_storage_provider()
    assert isinstance(provider, LocalStorageProvider)

    # Test save upload and save output
    clean_name, upload_path = provider.save_upload("test_job_123", "sample.pdf", b"%PDF-1.4 test")
    assert clean_name == "sample.pdf"
    assert "test_job_123" in upload_path

    clean_out, out_path = provider.save_output("test_job_123", "output.pdf", b"%PDF-1.4 output")
    assert clean_out == "output.pdf"

    # Test read output
    out_bytes = provider.get_output_bytes("test_job_123", "output.pdf")
    assert out_bytes == b"%PDF-1.4 output"

    # Test cleanup
    provider.cleanup_job("test_job_123")
    assert provider.get_output_bytes("test_job_123", "output.pdf") is None


def test_gcs_provider_interface():
    gcs_provider = GoogleCloudStorageProvider(bucket_name="pdfbolt-test-bucket")
    assert gcs_provider.bucket_name == "pdfbolt-test-bucket"

    # Check GCS path generation
    clean_name, gcs_path = gcs_provider.save_upload("job_gcs_99", "document.pdf", b"%PDF-1.4")
    assert clean_name == "document.pdf"
    assert gcs_path.startswith("gs://pdfbolt-test-bucket/jobs/job_gcs_99/input/")


def test_pubsub_queue_service():
    from backend.app.services.pubsub_service import pubsub_service
    msg_id = pubsub_service.publish_job(
        job_id="test_async_job_1",
        operation="compress",
        payload={"profile": "balanced"}
    )
    assert msg_id is not None
    assert "test_async_job_1" in msg_id


def test_zero_active_s3_storage_provider():
    import backend.app.services.storage_provider as sp_module
    assert not hasattr(sp_module, "S3StorageProvider"), "S3StorageProvider must be removed from production codebase"
