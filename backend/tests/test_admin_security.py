import pytest
import io
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.api.v1.admin import _failed_attempts, ADMIN_PASSWORD

client = TestClient(app)

def setup_function():
    _failed_attempts.clear()

def test_admin_auth_success():
    response = client.post("/api/v1/admin/auth/verify", json={"password": ADMIN_PASSWORD})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "token" in data
    assert data["expires_in_seconds"] == 7200

    token = data["token"]
    check_res = client.get("/api/v1/admin/auth/check", headers={"Authorization": f"Bearer {token}"})
    assert check_res.status_code == 200
    assert check_res.json()["valid"] is True

def test_admin_auth_invalid_password():
    response = client.post("/api/v1/admin/auth/verify", json={"password": "WrongPassword123!"})
    assert response.status_code == 401
    detail = response.json()["detail"]
    assert detail["code"] == "INVALID_ADMIN_PASSWORD"
    assert "remaining_attempts" in detail

def test_admin_auth_brute_force_lockout():
    for _ in range(5):
        res = client.post("/api/v1/admin/auth/verify", json={"password": "bad_guess"})
        assert res.status_code == 401

    blocked_res = client.post("/api/v1/admin/auth/verify", json={"password": "bad_guess"})
    assert blocked_res.status_code == 429
    assert blocked_res.json()["detail"]["code"] == "BRUTE_FORCE_LOCKOUT"

def test_dynamic_key_generation_and_feature_authorization():
    # 1. Login to get admin token
    auth_res = client.post("/api/v1/admin/auth/verify", json={"password": ADMIN_PASSWORD})
    token = auth_res.json()["token"]
    admin_headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a key restricted ONLY to 'compress'
    create_res = client.post("/api/v1/admin/keys", json={
        "name": "Compress Only Partner",
        "tier": "pro",
        "rate_limit": 200,
        "allowed_features": ["compress"],
        "key_prefix": "pdfbolt_live_"
    }, headers=admin_headers)

    assert create_res.status_code == 200
    key_data = create_res.json()
    assert key_data["activated_live"] is True
    partner_key = key_data["key"]
    partner_id = key_data["partner_id"]
    assert partner_key.startswith("pdfbolt_live_")

    # 3. Test listing keys
    list_res = client.get("/api/v1/admin/keys", headers=admin_headers)
    assert list_res.status_code == 200
    keys = list_res.json()["keys"]
    assert any(k["partner_id"] == partner_id for k in keys)

    # 4. Partner Key can access permitted feature (compress)
    dummy_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    compress_res = client.post(
        "/api/v1/jobs",
        data={"operation": "compress", "options": "{}"},
        files={"file": ("test.pdf", io.BytesIO(dummy_pdf), "application/pdf")},
        headers={"X-API-Key": partner_key}
    )
    # Should not be 403 Forbidden (compress is allowed!)
    assert compress_res.status_code != 403

    # 5. Partner Key is FORBIDDEN from accessing unpermitted feature (merge)
    merge_res = client.post(
        "/api/v1/jobs",
        data={"operation": "merge", "options": "{}"},
        files={"file": ("test.pdf", io.BytesIO(dummy_pdf), "application/pdf")},
        headers={"X-API-Key": partner_key}
    )
    assert merge_res.status_code == 403
    assert merge_res.json()["detail"]["code"] == "FEATURE_NOT_PERMITTED"

    # 6. Revoke key
    delete_res = client.delete(f"/api/v1/admin/keys/{partner_id}", headers=admin_headers)
    assert delete_res.status_code == 200

    # 7. Revoked key can no longer authenticate
    post_revoke_res = client.post(
        "/api/v1/jobs",
        data={"operation": "compress", "options": "{}"},
        files={"file": ("test.pdf", io.BytesIO(dummy_pdf), "application/pdf")},
        headers={"X-API-Key": partner_key}
    )
    assert post_revoke_res.status_code == 401
