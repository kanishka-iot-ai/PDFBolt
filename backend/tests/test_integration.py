from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)
FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_api_merge_integration():
    """INTEGRATION: POST /api/v1/jobs with merge operation and download result."""
    p3 = FIXTURES_DIR / "3page.pdf"
    p5 = FIXTURES_DIR / "multipage.pdf"

    with open(p3, "rb") as f1, open(p5, "rb") as f2:
        files = [
            ("files", ("3page.pdf", f1.read(), "application/pdf")),
            ("files", ("multipage.pdf", f2.read(), "application/pdf")),
        ]
        response = client.post("/api/v1/jobs", data={"operation": "merge"}, files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "COMPLETED"
    assert data["operation"] == "merge"
    
    dl_response = client.get(data["download_url"])
    assert dl_response.status_code == 200
    assert len(dl_response.content) > 100


def test_api_analyze_integration():
    """INTEGRATION: POST /api/v1/analyze returns full Section 12 JSON metadata."""
    p1 = FIXTURES_DIR / "1page_text.pdf"
    with open(p1, "rb") as f:
        response = client.post("/api/v1/analyze", files={"file": ("1page_text.pdf", f.read(), "application/pdf")})

    assert response.status_code == 200
    data = response.json()
    assert data["page_count"] == 1
    assert "file_size_bytes" in data
    assert "pages" in data
    assert len(data["pages"]) == 1
