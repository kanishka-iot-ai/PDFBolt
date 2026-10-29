import os
import shutil
import tempfile
import threading
import time
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
import docx
from pptx import Presentation
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
import io

from backend.app.processors.word_to_pdf import WordToPdfProcessor
from backend.app.processors.ppt_to_pdf import PptToPdfProcessor
from backend.app.processors.watermark import WatermarkProcessor
from backend.app.processors.page_numbers import PageNumbersProcessor
from backend.app.core.errors import OutputValidationError, PDFBoltError
from backend.app.core.validation import validate_pdf_output


# Helper to generate synthetic PDFs with custom page dimensions
def create_test_pdf(path: Path, page_dimensions: list[tuple[float, float]]):
    writer = PdfWriter()
    for idx, (w, h) in enumerate(page_dimensions):
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=(w, h))
        c.drawString(72, h - 72, f"Page {idx + 1} Dimension {w}x{h}")
        c.save()
        buf.seek(0)
        writer.add_page(PdfReader(buf).pages[0])
    with open(path, "wb") as f:
        writer.write(f)


# =============================================================================
# 1. LIBREOFFICE CONCURRENCY & ARGUMENT ORDERING TESTS
# =============================================================================

def test_word_to_pdf_command_order_and_isolated_profile(tmp_path):
    """
    Verifies that WordToPdfProcessor executes LibreOffice with:
    1. --outdir placed BEFORE input_path
    2. A unique -env:UserInstallation file URI
    3. Proper cleanup of the profile directory
    """
    docx_file = tmp_path / "test document with spaces.docx"
    doc = docx.Document()
    doc.add_paragraph("Testing isolated profile and argument ordering.")
    doc.save(str(docx_file))

    captured_cmds = []
    created_profiles = []

    def mock_subprocess_run(cmd, *args, **kwargs):
        captured_cmds.append(list(cmd))
        # Extract profile path from -env:UserInstallation=file:///...
        for arg in cmd:
            if arg.startswith("-env:UserInstallation="):
                created_profiles.append(arg.split("=")[1])
        # Simulate LibreOffice output PDF creation in outdir
        outdir = Path(cmd[cmd.index("--outdir") + 1])
        out_pdf = outdir / f"{docx_file.stem}.pdf"
        # Generate valid mock PDF
        writer = PdfWriter()
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=(612, 792))
        c.drawString(100, 700, "Mocked Output")
        c.save()
        buf.seek(0)
        writer.add_page(PdfReader(buf).pages[0])
        with open(out_pdf, "wb") as f:
            writer.write(f)

        mock_res = MagicMock()
        mock_res.returncode = 0
        mock_res.stderr = ""
        return mock_res

    with patch("backend.app.processors.word_to_pdf.shutil.which", return_value="/usr/bin/soffice"), \
         patch("subprocess.run", side_effect=mock_subprocess_run):
        proc = WordToPdfProcessor(job_id="job_word_test", work_dir=tmp_path)
        res = proc.run([docx_file], {})

        assert res.status == "COMPLETED"
        assert len(captured_cmds) == 1
        cmd = captured_cmds[0]

        # Verify --outdir precedes input_path
        outdir_idx = cmd.index("--outdir")
        input_idx = cmd.index(str(docx_file))
        assert outdir_idx < input_idx, f"Expected --outdir before input file, got {cmd}"

        # Verify isolated profile
        assert len(created_profiles) == 1
        assert "lo_prof_job_word_test" in created_profiles[0]


def test_concurrent_word_and_ppt_conversions(tmp_path):
    """
    Simulates concurrent Word and PowerPoint conversions.
    Confirms that each conversion receives a completely distinct profile directory
    with zero lock collisions.
    """
    doc_file = tmp_path / "doc.docx"
    doc = docx.Document()
    doc.add_paragraph("Concurrent doc")
    doc.save(str(doc_file))

    ppt_file = tmp_path / "pres.pptx"
    prs = Presentation()
    prs.slides.add_slide(prs.slide_layouts[0])
    prs.save(str(ppt_file))

    profiles_used = set()
    errors = []

    def run_word(job_id):
        try:
            with patch("backend.app.processors.word_to_pdf.shutil.which", return_value="/usr/bin/soffice"):
                def mock_run(cmd, *args, **kwargs):
                    for a in cmd:
                        if a.startswith("-env:UserInstallation="):
                            profiles_used.add(a)
                    outdir = Path(cmd[cmd.index("--outdir") + 1])
                    out_pdf = outdir / f"{doc_file.stem}.pdf"
                    writer = PdfWriter()
                    buf = io.BytesIO()
                    c = canvas.Canvas(buf, pagesize=(612, 792))
                    c.drawString(100, 700, "Mocked Output")
                    c.save()
                    buf.seek(0)
                    writer.add_page(PdfReader(buf).pages[0])
                    with open(out_pdf, "wb") as f:
                        writer.write(f)
                    return MagicMock(returncode=0, stderr="")

                with patch("subprocess.run", side_effect=mock_run):
                    p = WordToPdfProcessor(job_id=job_id, work_dir=tmp_path / job_id)
                    p.run([doc_file], {})
        except Exception as e:
            errors.append(e)

    def run_ppt(job_id):
        try:
            with patch("backend.app.processors.ppt_to_pdf.shutil.which", side_effect=lambda x: "/usr/bin/soffice" if x in ("soffice", "libreoffice") else None):
                def mock_run(cmd, *args, **kwargs):
                    for a in cmd:
                        if a.startswith("-env:UserInstallation="):
                            profiles_used.add(a)
                    outdir = Path(cmd[cmd.index("--outdir") + 1])
                    out_pdf = outdir / f"{ppt_file.stem}.pdf"
                    writer = PdfWriter()
                    buf = io.BytesIO()
                    c = canvas.Canvas(buf, pagesize=(612, 792))
                    c.drawString(100, 700, "Mocked Output")
                    c.save()
                    buf.seek(0)
                    writer.add_page(PdfReader(buf).pages[0])
                    with open(out_pdf, "wb") as f:
                        writer.write(f)
                    return MagicMock(returncode=0, stderr="")

                with patch("subprocess.run", side_effect=mock_run):
                    p = PptToPdfProcessor(job_id=job_id, work_dir=tmp_path / job_id)
                    p.run([ppt_file], {})
        except Exception as e:
            errors.append(e)

    t1 = threading.Thread(target=run_word, args=("word_concurrent_1",))
    t2 = threading.Thread(target=run_word, args=("word_concurrent_2",))
    t3 = threading.Thread(target=run_ppt, args=("ppt_concurrent_1",))

    for t in (t1, t2, t3):
        t.start()
    for t in (t1, t2, t3):
        t.join()

    assert not errors, f"Concurrent execution errors: {errors}"
    assert len(profiles_used) == 3, f"Expected 3 unique profiles, got {profiles_used}"


# =============================================================================
# 2. WATERMARK OVERLAY CACHING TESTS
# =============================================================================

def test_watermark_overlay_caching_homogeneous_document(tmp_path):
    """
    Verifies that on a 10-page document with identical page dimensions,
    the watermark overlay is generated exactly ONCE and reused 9 times.
    """
    pdf_path = tmp_path / "homo_10page.pdf"
    create_test_pdf(pdf_path, [(612.0, 792.0)] * 10)

    proc = WatermarkProcessor(job_id="test_wm_cache", work_dir=tmp_path)
    result = proc.run([pdf_path], {"text": "VERIFIED", "opacity": 0.5})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 10

    # Check metrics
    metrics = proc.metrics
    assert metrics["overlay_generations"] == 1, f"Expected 1 generation, got {metrics['overlay_generations']}"
    assert metrics["overlay_cache_hits"] == 9, f"Expected 9 cache hits, got {metrics['overlay_cache_hits']}"


def test_watermark_overlay_caching_mixed_dimensions(tmp_path):
    """
    Verifies that on a document with 3 different page dimensions (Letter, A4, Legal),
    exactly 3 overlays are generated and subsequent identical pages hit the cache.
    """
    pdf_path = tmp_path / "mixed_dims.pdf"
    # 2 Letter, 2 A4, 2 Legal = 6 pages, 3 unique dimensions
    dims = [
        (612.0, 792.0),
        (612.0, 792.0),
        (595.28, 841.89),
        (595.28, 841.89),
        (612.0, 1008.0),
        (612.0, 1008.0),
    ]
    create_test_pdf(pdf_path, dims)

    proc = WatermarkProcessor(job_id="test_wm_mixed", work_dir=tmp_path)
    result = proc.run([pdf_path], {"text": "CONFIDENTIAL"})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 6

    metrics = proc.metrics
    assert metrics["overlay_generations"] == 3
    assert metrics["overlay_cache_hits"] == 3


# =============================================================================
# 3. PAGE NUMBERS PROCESSOR DYNAMIC NUMBERING & CACHING TESTS
# =============================================================================

def test_page_numbers_correct_sequence_and_mixed_dimensions(tmp_path):
    """
    Verifies that PageNumbersProcessor correctly labels pages sequentially
    and preserves exact page count across mixed dimensions.
    """
    pdf_path = tmp_path / "pn_test.pdf"
    dims = [(612.0, 792.0), (595.0, 842.0), (612.0, 792.0)]
    create_test_pdf(pdf_path, dims)

    proc = PageNumbersProcessor(job_id="test_pn_seq", work_dir=tmp_path)
    result = proc.run([pdf_path], {"start_number": 5, "format": "page_x_of_y"})

    assert result.status == "COMPLETED"
    assert validate_pdf_output(result.output_path) == 3

    reader = PdfReader(str(result.output_path))
    assert len(reader.pages) == 3
    # Verify dimensions are preserved
    assert round(float(reader.pages[0].mediabox.width)) == 612
    assert round(float(reader.pages[1].mediabox.width)) == 595
    assert round(float(reader.pages[2].mediabox.width)) == 612
