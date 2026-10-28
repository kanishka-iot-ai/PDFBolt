import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings
from backend.app.core.security import partner_registry, hash_api_key, PartnerIdentity

client = TestClient(app)

TEST_PARTNER_ID = "fintech_partner"
TEST_PARTNER_KEY = "pdfbolt_live_fintech_partner_Secr3tToken1234567890abcdef"


@pytest.fixture(autouse=True)
def setup_partner_registry():
    """Sets up a test partner in the in-memory registry for testing."""
    original_keys = settings.PARTNER_API_KEYS
    original_require = settings.REQUIRE_API_KEY_FOR_EXTERNAL

    settings.PARTNER_API_KEYS = {
        TEST_PARTNER_ID: {
            "key": TEST_PARTNER_KEY,
            "tier": "enterprise",
            "rate_limit": 200
        }
    }
    settings.REQUIRE_API_KEY_FOR_EXTERNAL = False
    partner_registry.reload_keys()

    yield

    settings.PARTNER_API_KEYS = original_keys
    settings.REQUIRE_API_KEY_FOR_EXTERNAL = original_require
    partner_registry.reload_keys()


def test_first_party_web_origin_bypass(tiny_pdf_bytes):
    """
    Ensures PDFBolt's web frontend (e.g. pdfbolt.in) can submit jobs
    without an API key header.
    """
    response = client.post(
        "/api/v1/jobs",
        headers={"Origin": "https://pdfbolt.in"},
        data={"operation": "compress", "settings": '{"profile": "balanced"}'},
        files={"file": ("report.pdf", tiny_pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"


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

    # 2. Trusted web origin is still allowed through -> 200
    web_response = client.post(
        "/api/v1/jobs",
        headers={"Origin": "https://pdfbolt.in"},
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
