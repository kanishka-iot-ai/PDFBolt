import io
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from PIL import Image
from pypdf import PdfWriter, PdfReader


def generate_all_fixtures(fixtures_dir: Path):
    fixtures_dir.mkdir(parents=True, exist_ok=True)

    # 1. 1page_text.pdf
    p1 = fixtures_dir / "1page_text.pdf"
    can = canvas.Canvas(str(p1), pagesize=letter)
    can.setFont("Helvetica-Bold", 16)
    can.drawString(50, 750, "PDFBolt Test Document - 1 Page")
    can.setFont("Helvetica", 12)
    can.drawString(50, 720, "This is a single page text document for testing invariant correctness.")
    can.drawString(50, 700, "Secret confidential text: SSN-000-11-2222 inside bounding box.")
    can.save()

    # 2. multipage.pdf (5 pages)
    p_multi = fixtures_dir / "multipage.pdf"
    can_m = canvas.Canvas(str(p_multi), pagesize=letter)
    for i in range(1, 6):
        can_m.setFont("Helvetica-Bold", 18)
        can_m.drawString(50, 750, f"Document Page {i} of 5")
        can_m.setFont("Helvetica", 12)
        can_m.drawString(50, 700, f"This is page number {i} containing structured paragraphs for split and merge invariant tests.")
        can_m.showPage()
    can_m.save()

    # 3. 3page.pdf & 10page.pdf
    p3 = fixtures_dir / "3page.pdf"
    can3 = canvas.Canvas(str(p3), pagesize=letter)
    for i in range(1, 4):
        can3.setFont("Helvetica", 14)
        can3.drawString(50, 700, f"3-Page Test Document - Page {i}")
        can3.showPage()
    can3.save()

    p10 = fixtures_dir / "10page.pdf"
    can10 = canvas.Canvas(str(p10), pagesize=letter)
    for i in range(1, 11):
        can10.setFont("Helvetica", 14)
        can10.drawString(50, 700, f"10-Page Test Document - Page {i}")
        can10.showPage()
    can10.save()

    # 4. image_heavy.pdf
    p_img = fixtures_dir / "image_heavy.pdf"
    img_path = fixtures_dir / "temp_fixture_img.png"
    img = Image.new("RGB", (300, 300), color=(73, 109, 137))
    img.save(img_path)

    can_img = canvas.Canvas(str(p_img), pagesize=letter)
    can_img.drawImage(str(img_path), 100, 400, width=200, height=200)
    can_img.save()
    img_path.unlink(missing_ok=True)

    # 5. scanned.pdf
    p_scan = fixtures_dir / "scanned.pdf"
    can_scan = canvas.Canvas(str(p_scan), pagesize=letter)
    can_scan.setFont("Helvetica-Oblique", 14)
    can_scan.drawString(50, 700, "Scanned historical receipt simulation.")
    can_scan.save()

    # 6. table.pdf
    p_tab = fixtures_dir / "table.pdf"
    doc_t = SimpleDocTemplate(str(p_tab), pagesize=letter)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("Financial Statement Table", styles['Heading1']),
        Spacer(1, 20)
    ]
    data = [
        ['Item', 'Quarter 1', 'Quarter 2', 'Total'],
        ['Product Revenue', '$10,000', '$15,000', '$25,000'],
        ['Service Revenue', '$5,000', '$7,000', '$12,000'],
        ['Operating Costs', '$4,000', '$4,500', '$8,500'],
    ]
    t = Table(data)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(t)
    doc_t.build(story)

    # 7. encrypted.pdf
    p_enc = fixtures_dir / "encrypted.pdf"
    reader_src = PdfReader(str(p1))
    writer_enc = PdfWriter()
    for page in reader_src.pages:
        writer_enc.add_page(page)
    writer_enc.encrypt(user_password="secret123", owner_password="secret123")
    with open(p_enc, "wb") as f:
        writer_enc.write(f)

    # 8. rotated.pdf
    p_rot = fixtures_dir / "rotated.pdf"
    reader_rot = PdfReader(str(p1))
    writer_rot = PdfWriter()
    for page in reader_rot.pages:
        page.rotate(90)
        writer_rot.add_page(page)
    with open(p_rot, "wb") as f:
        writer_rot.write(f)

    # 9. malformed.pdf
    p_mal = fixtures_dir / "malformed.pdf"
    with open(p_mal, "wb") as f:
        f.write(b"%PDF-1.4\nCorrupted binary payload\x00\xff\xfeEOF")

    # 10. large.pdf
    p_lg = fixtures_dir / "large.pdf"
    can_lg = canvas.Canvas(str(p_lg), pagesize=letter)
    for p in range(1, 15):
        can_lg.drawString(50, 700, f"Large file page {p} with repeating text data blocks " * 10)
        can_lg.showPage()
    can_lg.save()


if __name__ == "__main__":
    generate_all_fixtures(Path(__file__).parent)
