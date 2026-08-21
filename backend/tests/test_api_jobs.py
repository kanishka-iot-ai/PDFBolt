import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_endpoints():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

    response = client.get("/ready")
    assert response.status_code == 200

    response = client.get("/version")
    assert response.status_code == 200


def test_analyze_api_endpoint(tiny_pdf_bytes):
    response = client.post(
        "/api/v1/analyze",
        files={"file": ("test.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["page_count"] == 1
    assert data["size_bytes"] == len(tiny_pdf_bytes)


def test_job_compression_api_lifecycle(tiny_pdf_bytes):
    # Submit compression job
    response = client.post(
        "/api/v1/jobs",
        data={"operation": "compress", "settings": '{"profile": "balanced"}'},
        files={"file": ("report.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    job_data = response.json()
    assert job_data["status"] == "COMPLETED"
    assert job_data["job_id"] is not None
    assert "token=" in job_data["download_url"]

    # Test download endpoint
    job_id = job_data["job_id"]
    blocked_response = client.get(f"/api/v1/jobs/{job_id}/download")
    assert blocked_response.status_code == 401

    dl_response = client.get(job_data["download_url"])
    assert dl_response.status_code == 200
    assert dl_response.content.startswith(b"%PDF-")
