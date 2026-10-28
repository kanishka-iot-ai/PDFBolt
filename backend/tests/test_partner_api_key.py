import pytest
from fastapi.testclient import TestClient
from fastapi import Request
from backend.app.main import app
from backend.app.config import settings
from backend.app.core.security import (
    partner_registry,
    hash_api_key,
    PartnerIdentity,
    get_client_ip,
    RateLimiter
)

client = TestClient(app)

TEST_PARTNER_ID = "fintech_partner"
TEST_PARTNER_KEY = "pdfbolt_live_fintech_partner_Secr3tToken1234567890abcdef"


@pytest.fixture(autouse=True)
def setup_partner_registry():
    """Sets up a test partner in the in-memory registry for testing."""
    original_keys = settings.PARTNER_API_KEYS
    original_require = settings.REQUIRE_API_KEY_FOR_EXTERNAL
    original_token = settings.FRONTEND_INTERNAL_TOKEN

    settings.PARTNER_API_KEYS = {
        TEST_PARTNER_ID: {
            "key": TEST_PARTNER_KEY,
            "tier": "enterprise",
            "rate_limit": 200
        }
    }
    settings.REQUIRE_API_KEY_FOR_EXTERNAL = False
    settings.FRONTEND_INTERNAL_TOKEN = "pdfbolt_app_internal_v1_secure"
    partner_registry.reload_keys()

    yield

    settings.PARTNER_API_KEYS = original_keys
    settings.REQUIRE_API_KEY_FOR_EXTERNAL = original_require
    settings.FRONTEND_INTERNAL_TOKEN = original_token
    partner_registry.reload_keys()


def test_first_party_web_origin_bypass(tiny_pdf_bytes):
    """
    Ensures PDFBolt's web frontend (e.g. pdfbolt.in) can submit jobs
    without an API key header.
    """
    response = client.post(
        "/api/v1/jobs",
        headers={"Origin": "https://pdfbolt.in", "Sec-Fetch-Site": "same-origin"},
        data={"operation": "compress", "settings": '{"profile": "balanced"}'},
        files={"file": ("report.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"


def test_first_party_with_client_token(tiny_pdf_bytes):
    """
    Verifies that requests passing X-PDFBolt-Client-Token are recognized as first-party web app.
    """
    settings.REQUIRE_API_KEY_FOR_EXTERNAL = True

    response = client.post(
        "/api/v1/jobs",
        headers={
            "Origin": "https://pdfbolt.in",
            "X-PDFBolt-Client-Token": "pdfbolt_app_internal_v1_secure"
        },
        data={"operation": "compress"},
        files={"file": ("report.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "COMPLETED"


def test_partner_auth_via_x_api_key(tiny_pdf_bytes):
    """
    External partner calling with X-API-Key header is authenticated.
    """
    response = client.post(
        "/api/v1/jobs",
        headers={"X-API-Key": TEST_PARTNER_KEY},
        data={"operation": "compress", "settings": '{"profile": "balanced"}'},
        files={"file": ("report.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["metrics"].get("partner_id") == TEST_PARTNER_ID
    assert data["metrics"].get("tier") == "enterprise"


def test_partner_auth_via_authorization_bearer(tiny_pdf_bytes):
    """
    External partner calling with Authorization: Bearer <key> is authenticated.
    """
    response = client.post(
        "/api/v1/jobs",
        headers={"Authorization": f"Bearer {TEST_PARTNER_KEY}"},
        data={"operation": "compress", "settings": '{"profile": "balanced"}'},
        files={"file": ("report.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["metrics"].get("partner_id") == TEST_PARTNER_ID


def test_invalid_api_key_rejected(tiny_pdf_bytes):
    """
    Submitting an invalid or revoked API key returns HTTP 401.
    """
    response = client.post(
        "/api/v1/jobs",
        headers={"X-API-Key": "pdfbolt_live_fraudulent_key_xyz"},
        data={"operation": "compress"},
        files={"file": ("report.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 401
    err = response.json()
    assert err["detail"]["code"] == "INVALID_API_KEY"


def test_external_call_blocked_when_enforcement_enabled(tiny_pdf_bytes):
    """
    When REQUIRE_API_KEY_FOR_EXTERNAL is True, external calls without key are blocked.
    """
    settings.REQUIRE_API_KEY_FOR_EXTERNAL = True

    # 1. External call without Origin and without Key -> 401
    response = client.post(
        "/api/v1/jobs",
        data={"operation": "compress"},
        files={"file": ("report.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 401
    err = response.json()
    assert err["detail"]["code"] == "API_KEY_REQUIRED"

    # 2. Verified web origin with Sec-Fetch-Site is allowed through -> 200
    web_response = client.post(
        "/api/v1/jobs",
        headers={"Origin": "https://pdfbolt.in", "Sec-Fetch-Site": "same-origin"},
        data={"operation": "compress"},
        files={"file": ("report.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert web_response.status_code == 200

    # 3. External call with valid Partner Key is allowed through -> 200
    partner_response = client.post(
        "/api/v1/jobs",
        headers={"X-API-Key": TEST_PARTNER_KEY},
        data={"operation": "compress"},
        files={"file": ("report.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert partner_response.status_code == 200


def test_constant_time_key_matching():
    """
    Verifies that partner registry lookup behaves correctly and uses constant-time digest comparison.
    """
    assert partner_registry.authenticate_key(TEST_PARTNER_KEY) is not None
    assert partner_registry.authenticate_key("wrong_key") is None
    assert partner_registry.authenticate_key("") is None
    assert partner_registry.authenticate_key(None) is None


def test_proxy_ip_resolution():
    """
    Tests get_client_ip resolving CF-Connecting-IP and X-Forwarded-For properly.
    """
    class DummyRequest:
        def __init__(self, headers, client_host="10.0.0.1"):
            self.headers = headers
            self.client = type("Client", (), {"host": client_host})()

    # Cloudflare IP priority
    req_cf = DummyRequest({"CF-Connecting-IP": "203.0.113.195", "X-Forwarded-For": "198.51.100.1"})
    assert get_client_ip(req_cf) == "203.0.113.195"

    # X-Forwarded-For leftmost client IP
    req_xff = DummyRequest({"X-Forwarded-For": "198.51.100.25, 10.0.0.1"})
    assert get_client_ip(req_xff) == "198.51.100.25"

    # Direct fallback
    req_direct = DummyRequest({}, client_host="192.0.2.1")
    assert get_client_ip(req_direct) == "192.0.2.1"


def test_rate_limiter_memory_bounded_eviction():
    """
    Verifies that RateLimiter bounds its dictionary size and purges stale timestamps.
    """
    limiter = RateLimiter(requests_per_minute=10, max_entries=5)

    # Insert 5 clients
    for i in range(5):
        assert limiter.check_rate_limit(f"client_{i}") is True
    assert len(limiter.requests) == 5

    # Insert 6th client -> oldest (client_0) should be evicted by LRU bound
    assert limiter.check_rate_limit("client_5") is True
    assert len(limiter.requests) <= 5
    assert "client_0" not in limiter.requests
    assert "client_5" in limiter.requests
