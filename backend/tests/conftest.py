import io
import pytest
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from PIL import Image
import pypdf


@pytest.fixture(scope="session")
def tiny_pdf_bytes() -> bytes:
    """Creates a realistic small PDF (~75 KB)."""
    buf = io.BytesIO()
    can = canvas.Canvas(buf, pagesize=letter)
    can.setFont("Helvetica-Bold", 16)
    can.drawString(100, 700, "Quarterly Financial Analysis & Summary")
    can.setFont("Helvetica", 12)
    for i in range(25):
        can.drawString(100, 660 - (i * 20), f"Line {i + 1}: Revenue target metrics and quarterly operating expenditure indicators.")
    can.save()
    raw = buf.getvalue()
    # Pad to approximately ~75 KB if needed
    if len(raw) < 75 * 1024:
        padding = b"\n% " + (b"X" * (75 * 1024 - len(raw) - 10))
        return raw + padding
    return raw


@pytest.fixture(scope="session")
def multi_page_pdf_bytes() -> bytes:
    """Creates a 5-page PDF document."""
    buf = io.BytesIO()
    can = canvas.Canvas(buf, pagesize=letter)
    for page_num in range(1, 6):
        can.setFont("Helvetica-Bold", 18)
        can.drawString(100, 700, f"Document Section — Page {page_num}")
        can.setFont("Helvetica", 12)
        can.drawString(100, 650, f"This is the official test content for page number {page_num} of 5.")
        can.showPage()
    can.save()
    return buf.getvalue()


@pytest.fixture(scope="session")
def image_heavy_pdf_bytes() -> bytes:
    """Creates a PDF with embedded raster JPEG images."""
    # Create test PIL image
    img = Image.new("RGB", (800, 600), color=(73, 109, 137))
    img_buf = io.BytesIO()
    img.save(img_buf, format="JPEG", quality=95)
    img_buf.seek(0)

    buf = io.BytesIO()
    can = canvas.Canvas(buf, pagesize=letter)
    can.drawString(100, 700, "Image Heavy Document")
    can.drawInlineImage(img, 100, 200, width=400, height=300)
    can.save()
    return buf.getvalue()


@pytest.fixture(scope="session")
def malformed_pdf_bytes() -> bytes:
    """Corrupted PDF payload."""
    return b"%PDF-1.4\nCorrupted binary xref data here\x00\xff\xfeTRAILER%%EOF"
