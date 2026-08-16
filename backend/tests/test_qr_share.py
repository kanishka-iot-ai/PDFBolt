import os
import time
import io
import datetime
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.qr_share import QRShareStatus
from backend.app.services.qr_share_manager import qr_share_manager

client = TestClient(app)

SAMPLE_PDF_BYTES = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n"
    b"0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
)


def test_qr_share_creation_with_durations():
    """Verify QR share creation with default 24h and user-selectable durations."""
    # 1. Default (24 hours = 86400s)
    resp = client.post(
        "/api/v1/qr-shares",
        files={"file": ("test.pdf", SAMPLE_PDF_BYTES, "application/pdf")},
        data={"duration_seconds": 86400}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ACTIVE"
    assert data["duration_seconds"] == 86400
    assert "https://pdfbolt.com/s/" in data["share_url"]
    assert data["revocation_token"] is not None
    assert data["retention_notice"] == "This file is stored temporarily and will be automatically deleted when the share expires."

    # 2. Custom 15 minutes (900s)
    resp_15m = client.post(
        "/api/v1/qr-shares",
        files={"file": ("short.pdf", SAMPLE_PDF_BYTES, "application/pdf")},
        data={"duration_seconds": 900}
    )
    assert resp_15m.status_code == 200
    assert resp_15m.json()["duration_seconds"] == 900


def test_qr_share_public_retrieval_and_download():
    """Verify recipient can view metadata and download document while active."""
    create_resp = client.post(
        "/api/v1/qr-shares",
        files={"file": ("share_download.pdf", SAMPLE_PDF_BYTES, "application/pdf")},
        data={"duration_seconds": 3600}
    )
    share_id = create_resp.json()["share_id"]

    # Public metadata lookup
    info_resp = client.get(f"/api/v1/qr-shares/{share_id}")
    assert info_resp.status_code == 200
    info_data = info_resp.json()
    assert info_data["status"] == "ACTIVE"
    assert info_data["filename"] == "share_download.pdf"
    assert info_data["revocation_token"] is None  # Private token never exposed publicly

    # Download document
    dl_resp = client.get(f"/api/v1/qr-shares/{share_id}/download")
    assert dl_resp.status_code == 200
    assert dl_resp.content.startswith(b"%PDF-")


def test_qr_share_immediate_revocation():
    """Verify owner can revoke share immediately, deleting file from storage."""
    create_resp = client.post(
        "/api/v1/qr-shares",
        files={"file": ("revoke_test.pdf", SAMPLE_PDF_BYTES, "application/pdf")},
        data={"duration_seconds": 86400}
    )
    share_id = create_resp.json()["share_id"]
    revocation_token = create_resp.json()["revocation_token"]

    # Verify file exists on disk
    file_path = qr_share_manager.shares[share_id]["file_path"]
    assert os.path.exists(file_path)

    # Revoke with valid token
    revoke_resp = client.post(
        f"/api/v1/qr-shares/{share_id}/revoke",
        json={"revocation_token": revocation_token}
    )
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["status"] == "REVOKED"

    # Verify physical file is deleted immediately
    assert not os.path.exists(file_path)

    # Subsequent access returns 410 Gone / Revoked
    info_resp = client.get(f"/api/v1/qr-shares/{share_id}")
    assert info_resp.status_code == 410

    dl_resp = client.get(f"/api/v1/qr-shares/{share_id}/download")
    assert dl_resp.status_code == 410


def test_qr_share_expired_rejection_and_cleanup():
    """Verify expired QR shares are rejected and automatically purged."""
    create_resp = client.post(
        "/api/v1/qr-shares",
        files={"file": ("expire_test.pdf", SAMPLE_PDF_BYTES, "application/pdf")},
        data={"duration_seconds": 900}
    )
    share_id = create_resp.json()["share_id"]
    file_path = qr_share_manager.shares[share_id]["file_path"]
    assert os.path.exists(file_path)

    # Simulate expiration (created in past)
    past_dt = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=1000)
    qr_share_manager.shares[share_id]["expires_at"] = past_dt.isoformat()

    # Accessing expired share returns 410 and triggers file purge
    resp = client.get(f"/api/v1/qr-shares/{share_id}")
    assert resp.status_code == 410
    assert not os.path.exists(file_path)


def test_qr_share_one_time_scan():
    """Verify one-time scan share is purged immediately after first download."""
    create_resp = client.post(
        "/api/v1/qr-shares",
        files={"file": ("onetime.pdf", SAMPLE_PDF_BYTES, "application/pdf")},
        data={"duration_seconds": 86400, "one_time_scan": True}
    )
    share_id = create_resp.json()["share_id"]
    file_path = qr_share_manager.shares[share_id]["file_path"]
    assert os.path.exists(file_path)

    # First download succeeds
    dl_resp1 = client.get(f"/api/v1/qr-shares/{share_id}/download")
    assert dl_resp1.status_code == 200

    # File is now deleted
    assert not os.path.exists(file_path)

    # Second download fails
    dl_resp2 = client.get(f"/api/v1/qr-shares/{share_id}/download")
    assert dl_resp2.status_code == 410


def test_qr_share_pin_protection():
    """Verify PIN protection enforces authentication."""
    create_resp = client.post(
        "/api/v1/qr-shares",
        files={"file": ("pin_doc.pdf", SAMPLE_PDF_BYTES, "application/pdf")},
        data={"duration_seconds": 86400, "pin": "9876"}
    )
    share_id = create_resp.json()["share_id"]

    # Access without PIN fails (403)
    resp_no_pin = client.get(f"/api/v1/qr-shares/{share_id}")
    assert resp_no_pin.status_code == 403

    # Access with wrong PIN fails (403)
    resp_wrong_pin = client.get(f"/api/v1/qr-shares/{share_id}?pin=1234")
    assert resp_wrong_pin.status_code == 403

    # Access with correct PIN succeeds (200)
    resp_correct = client.get(f"/api/v1/qr-shares/{share_id}?pin=9876")
    assert resp_correct.status_code == 200
