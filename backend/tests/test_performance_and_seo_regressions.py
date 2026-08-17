import os
import re
import json
import xml.etree.ElementTree as ET
import pytest

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def test_logo_asset_size_budget():
    """Ensure logo assets are tightly budgeted to prevent CLS and LCP regressions."""
    svg_logo = os.path.join(REPO_ROOT, "public", "pdfbolt-logo.svg")
    png_logo = os.path.join(REPO_ROOT, "public", "pdfbolt-logo-transparent.png")
    webp_logo = os.path.join(REPO_ROOT, "public", "pdfbolt-logo.webp")

    assert os.path.exists(svg_logo), "SVG logo missing from public/"
    assert os.path.exists(png_logo), "PNG logo missing from public/"
    assert os.path.exists(webp_logo), "WebP logo missing from public/"

    svg_size = os.path.getsize(svg_logo)
    png_size = os.path.getsize(png_logo)
    webp_size = os.path.getsize(webp_logo)

    # Budget assertions
    assert svg_size < 5 * 1024, f"SVG logo exceeded 5 KiB budget: {svg_size} bytes"
    assert png_size < 50 * 1024, f"PNG logo exceeded 50 KiB budget: {png_size} bytes"
    assert webp_size < 30 * 1024, f"WebP logo exceeded 30 KiB budget: {webp_size} bytes"

def test_no_blocking_google_fonts_in_critical_path():
    """Ensure Google Fonts are not loaded via blocking render-critical link tags."""
    index_html = os.path.join(REPO_ROOT, "index.html")
    with open(index_html, "r", encoding="utf-8") as f:
        content = f.read()

    assert "fonts.googleapis.com" not in content, "Found blocking Google Fonts in index.html"
    assert "fonts.gstatic.com" not in content, "Found blocking Google Fonts gstatic preconnect in index.html"

def test_logo_explicit_dimensions_in_nav_and_html():
    """Verify explicit width and height on logo images to guarantee 0 CLS."""
    index_html = os.path.join(REPO_ROOT, "index.html")
    with open(index_html, "r", encoding="utf-8") as f:
        html = f.read()

    assert 'width="160"' in html or 'width="140"' in html or 'width="180"' in html, "index.html logo missing explicit width"
    assert 'height="40"' in html or 'height="36"' in html or 'height="44"' in html, "index.html logo missing explicit height"

    navbar_tsx = os.path.join(REPO_ROOT, "src", "components", "Navbar.tsx")
    with open(navbar_tsx, "r", encoding="utf-8") as f:
        nav = f.read()

    assert 'width="160"' in nav or 'width="140"' in nav, "Navbar.tsx logo missing explicit width"
    assert 'height="40"' in nav or 'height="36"' in nav, "Navbar.tsx logo missing explicit height"

def test_heavy_services_use_dynamic_imports():
    """Ensure processing engines (jspdf, docx, exceljs, tesseract, mammoth) are imported dynamically."""
    services_to_check = [
        "conversionService.ts",
        "handwritingService.ts",
        "ocrService.ts",
        "pptService.ts",
        "sanitizeService.ts",
        "analyzerService.ts",
    ]

    forbidden_static = [
        "import * as mammoth",
        "import Tesseract from",
        "import ExcelJS from",
        "import jsPDF from",
        "import JSZip from",
    ]

    for svc in services_to_check:
        svc_path = os.path.join(REPO_ROOT, "src", "services", svc)
        if os.path.exists(svc_path):
            with open(svc_path, "r", encoding="utf-8") as f:
                content = f.read()
            for pattern in forbidden_static:
                assert pattern not in content, f"Forbidden static import '{pattern}' found in {svc}"

def test_strict_security_headers_configured():
    """Verify CSP, HSTS, and COOP are configured in both staticwebapp.config.json and nginx.conf."""
    # Check staticwebapp.config.json
    swa_path = os.path.join(REPO_ROOT, "staticwebapp.config.json")
    with open(swa_path, "r", encoding="utf-8") as f:
        swa_cfg = json.load(f)

    headers = swa_cfg.get("globalHeaders", {})
    assert "Content-Security-Policy" in headers, "CSP header missing in staticwebapp.config.json"
    assert "Strict-Transport-Security" in headers, "HSTS header missing in staticwebapp.config.json"
    assert "Cross-Origin-Opener-Policy" in headers, "COOP header missing in staticwebapp.config.json"
    assert "wasm-unsafe-eval" in headers["Content-Security-Policy"], "wasm-unsafe-eval missing in CSP"
    assert "worker-src" in headers["Content-Security-Policy"], "worker-src missing in CSP"

    # Check nginx.conf
    nginx_path = os.path.join(REPO_ROOT, "nginx.conf")
    with open(nginx_path, "r", encoding="utf-8") as f:
        nginx = f.read()

    assert "Content-Security-Policy" in nginx, "CSP missing in nginx.conf"
    assert "Strict-Transport-Security" in nginx, "HSTS missing in nginx.conf"
    assert "Cross-Origin-Opener-Policy" in nginx, "COOP missing in nginx.conf"

def test_sitemap_url_integrity_and_canonical_domain():
    """Verify that all sitemaps reference only https://pdfbolt.in and contain 0 legacy domains."""
    sitemap_files = [
        "sitemap.xml",
        "sitemap-tools.xml",
        "sitemap-guides.xml",
        "sitemap-encyclopedia.xml",
        "sitemap-workflows.xml",
    ]

    for sm_file in sitemap_files:
        path = os.path.join(REPO_ROOT, "public", sm_file)
        assert os.path.exists(path), f"Sitemap file {sm_file} is missing"

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "pdfbolt.com" not in content, f"Legacy domain pdfbolt.com found in {sm_file}"
        assert "pro-portfolio.com" not in content, f"Legacy domain pro-portfolio.com found in {sm_file}"
        assert "<loc>http://" not in content, f"Insecure HTTP URL found in {sm_file}"
        assert "https://pdfbolt.in" in content, f"Canonical domain missing in {sm_file}"
