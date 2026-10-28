import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.api.v1.admin import _failed_attempts, ADMIN_PASSWORD

client = TestClient(app)

def setup_function():
    # Clear in-memory failed attempts before each test
    _failed_attempts.clear()

def test_admin_auth_success():
    response = client.post("/api/v1/admin/auth/verify", json={"password": ADMIN_PASSWORD})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "token" in data
    assert data["expires_in_seconds"] == 7200

    # Test checking the valid session token
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
    # 5 consecutive failed attempts trigger a 429 lockout
    for _ in range(5):
        res = client.post("/api/v1/admin/auth/verify", json={"password": "bad_guess"})
        assert res.status_code == 401

    # 6th attempt should be blocked with 429 Too Many Requests
    blocked_res = client.post("/api/v1/admin/auth/verify", json={"password": "bad_guess"})
    assert blocked_res.status_code == 429
    assert blocked_res.json()["detail"]["code"] == "BRUTE_FORCE_LOCKOUT"

    # Even with the correct password, the IP is locked out
    locked_correct_res = client.post("/api/v1/admin/auth/verify", json={"password": ADMIN_PASSWORD})
    assert locked_correct_res.status_code == 429

def test_admin_check_invalid_or_forged_token():
    res = client.get("/api/v1/admin/auth/check", headers={"Authorization": "Bearer forged.token.abc"})
    assert res.status_code == 401
    assert res.json()["detail"]["code"] == "SESSION_EXPIRED"
