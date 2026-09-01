import pytest
from pathlib import Path
from backend.app.processors.html_to_pdf import HtmlToPdfProcessor


def test_html_to_pdf_conversion(tmp_path):
    """INVARIANT: Generates valid PDF from HTML source content."""
    html_file = tmp_path / "sample.html"
    html_file.write_text("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Page</title>
        <style>
            body { font-family: sans-serif; margin: 20px; }
            h1 { color: #1e3a8a; }
            p { color: #334155; }
        </style>
    </head>
    <body>
        <h1>PDFBolt HTML to PDF Engine</h1>
        <p>Testing high-fidelity HTML conversion to PDF format.</p>
    </body>
    </html>
    """, encoding="utf-8")

    processor = HtmlToPdfProcessor(job_id="test_html2pdf", work_dir=tmp_path)
    result = processor.run([html_file], {})

    assert result.output_path.exists()
    assert result.output_path.suffix.lower() == ".pdf"
    assert result.output_path.stat().st_size > 0
