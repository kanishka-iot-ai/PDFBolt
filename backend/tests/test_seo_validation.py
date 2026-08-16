import os
import re
import xml.etree.ElementTree as ET
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CANONICAL_TOOLS = [
    "/pdf-to-word",
    "/pdf-to-excel",
    "/pdf-to-ppt",
    "/pdf-to-jpg",
    "/compress-pdf",
    "/merge-pdf",
    "/split-pdf",
    "/rotate-pdf",
    "/delete-pdf-pages",
    "/organize-pdf",
    "/watermark-pdf",
    "/add-page-numbers-to-pdf",
    "/protect-pdf",
    "/unlock-pdf",
    "/sign-pdf",
    "/redact-pdf",
    "/ocr-pdf",
    "/analyze-pdf",
    "/edit-pdf",
    "/pdf-builder",
    "/pdf-to-qr-code",
    "/scan-to-pdf",
    "/scan-handwriting-to-pdf",
    "/compare-pdf",
    "/repair-pdf"
]

LEGACY_ALIASES = {
    "/merge": "/merge-pdf",
    "/split": "/split-pdf",
    "/compress": "/compress-pdf",
    "/pdf-analyzer": "/analyze-pdf",
    "/analyze": "/analyze-pdf",
    "/tools/pdf-analyzer": "/analyze-pdf",
    "/pdf-editor": "/edit-pdf",
    "/edit": "/edit-pdf",
    "/qr-pdf-share": "/pdf-to-qr-code",
    "/pdf-to-qr": "/pdf-to-qr-code",
    "/extract-pages": "/split-pdf",
    "/extract-pdf-pages": "/split-pdf",
    "/organize": "/organize-pdf",
    "/reorder-pages": "/organize-pdf",
    "/rotate": "/rotate-pdf",
    "/watermark": "/watermark-pdf",
    "/delete-pages": "/delete-pdf-pages",
    "/page-numbers": "/add-page-numbers-to-pdf",
    "/add-page-numbers": "/add-page-numbers-to-pdf",
    "/protect": "/protect-pdf",
    "/unlock": "/unlock-pdf",
    "/sign": "/sign-pdf",
    "/redact": "/redact-pdf",
    "/repair": "/repair-pdf",
    "/ocr": "/ocr-pdf",
    "/scan-pdf": "/scan-to-pdf",
    "/scan-handwriting": "/scan-handwriting-to-pdf",
    "/compare": "/compare-pdf",
    "/pdf-to-images": "/pdf-to-jpg"
}


def test_robots_txt_rules():
    """Verify robots.txt allows canonical tool paths and blocks private endpoints."""
    robots_path = os.path.join(BASE_DIR, "public", "robots.txt")
    assert os.path.exists(robots_path), "robots.txt must exist"
    
    with open(robots_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Public allowed
    assert "Allow: /" in content
    assert "Allow: /tools" in content
    
    # Private disallowed
    assert "Disallow: /api/" in content
    assert "Disallow: /jobs/" in content
    assert "Disallow: /storage/" in content
    assert "Disallow: /qr-success" in content
    assert "Disallow: /test-files" in content
    
    # No overly broad wildcard query blocking
    assert "Disallow: /*?*" not in content, "Wildcard /*?* should not be present"
    assert "Sitemap: https://pdfbolt.com/sitemap.xml" in content


def test_sitemap_contains_only_canonical_urls():
    """Verify sitemaps contain only clean canonical URLs and zero aliases or redirects."""
    sitemap_path = os.path.join(BASE_DIR, "public", "sitemap.xml")
    assert os.path.exists(sitemap_path), "sitemap.xml must exist"
    
    with open(sitemap_path, "r", encoding="utf-8") as f:
        sitemap_content = f.read()

    # Ensure no alias exists in the sitemap
    for alias in LEGACY_ALIASES.keys():
        assert f"https://pdfbolt.com{alias}</loc>" not in sitemap_content, f"Alias {alias} must not be in sitemap"

    # Ensure all primary tools are represented
    tools_sitemap_path = os.path.join(BASE_DIR, "public", "sitemap-tools.xml")
    if os.path.exists(tools_sitemap_path):
        with open(tools_sitemap_path, "r", encoding="utf-8") as f:
            tools_content = f.read()
        for tool in CANONICAL_TOOLS:
            assert f"https://pdfbolt.com{tool}</loc>" in tools_content or f"https://pdfbolt.com{tool}</loc>" in sitemap_content, f"Canonical tool {tool} must be in sitemap"


def test_redirects_are_one_hop_permanent():
    """Verify _redirects file configures direct 301 rules without redirect chains."""
    redirects_path = os.path.join(BASE_DIR, "public", "_redirects")
    assert os.path.exists(redirects_path), "_redirects must exist"

    with open(redirects_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    redirect_map = {}
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) >= 2 and parts[0] != "/*":
            src = parts[0]
            dst = parts[1]
            redirect_map[src] = dst

    for alias, target in LEGACY_ALIASES.items():
        assert alias in redirect_map, f"Alias {alias} must be defined in _redirects"
        assert redirect_map[alias] == target, f"Alias {alias} must redirect directly to {target}"
        # Ensure target is a canonical tool and not another redirect (no redirect chains)
        assert redirect_map[alias] not in redirect_map, f"Target {redirect_map[alias]} must not be a redirect"


def test_domain_301_migration_configuration():
    """Verify nginx.conf configures direct 1-hop 301 redirect from pdfbolt.in to pdfbolt.com."""
    nginx_path = os.path.join(BASE_DIR, "nginx.conf")
    assert os.path.exists(nginx_path), "nginx.conf must exist"

    with open(nginx_path, "r", encoding="utf-8") as f:
        nginx_content = f.read()

    assert "server_name pdfbolt.in www.pdfbolt.in;" in nginx_content
    assert "return 301 https://pdfbolt.com$request_uri;" in nginx_content


def test_api_x_robots_tag():
    """Verify private API endpoints return X-Robots-Tag: noindex, nofollow, noarchive."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers.get("x-robots-tag") == "noindex, nofollow, noarchive"

