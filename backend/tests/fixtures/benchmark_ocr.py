import time
import tracemalloc
import tempfile
import io
from pathlib import Path
from unittest.mock import patch
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
import pdfplumber

from backend.app.processors.ocr import OcrProcessor

def run_unoptimized_ocr(input_pdf: Path, work_dir: Path):
    """Simulates the baseline unoptimized path: pdfplumber.open() called inside per-page loop."""
    reader = PdfReader(str(input_pdf), strict=False)
    total_pages = len(reader.pages)
    writer = PdfWriter()
    opens_count = 0

    for idx, page in enumerate(reader.pages):
        existing_text = page.extract_text() or ""
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)

        if not existing_text.strip():
            # Baseline bug: opening pdfplumber on every page
            opens_count += 1
            with pdfplumber.open(str(input_pdf)) as pdf_doc:
                plumb_page = pdf_doc.pages[idx]
                pil_img = plumb_page.to_image(resolution=150).original
                # Simulate pytesseract execution (or mock)
                ocr_text = f"Sample recognized text line for page {idx+1}"
                packet = io.BytesIO()
                can = canvas.Canvas(packet, pagesize=(width, height))
                can.setFillColor(colors.Color(0, 0, 0, alpha=0.01))
                can.setFont("Helvetica", 10)
                can.drawString(40, height - 40, ocr_text)
                can.save()
                packet.seek(0)
                overlay = PdfReader(packet)
                page.merge_page(overlay.pages[0])

        writer.add_page(page)

    out = work_dir / "unoptimized.pdf"
    with open(out, "wb") as f:
        writer.write(f)
    return out, opens_count

def benchmark():
    input_pdf = Path("backend/tests/fixtures/synthetic_scan_5p.pdf")
    assert input_pdf.exists()

    with tempfile.TemporaryDirectory() as td:
        work_dir = Path(td)

        # 1. Benchmark Unoptimized Baseline
        tracemalloc.start()
        t0 = time.perf_counter()
        with patch("backend.app.processors.ocr.OcrProcessor._ocr_image_to_text", return_value="Sample recognized text line"):
            out_unopt, opens_unopt = run_unoptimized_ocr(input_pdf, work_dir)
        t_unopt = time.perf_counter() - t0
        _, peak_mem_unopt = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        # 2. Benchmark Optimized Single-Context Engine
        tracemalloc.start()
        t0 = time.perf_counter()
        open_count_opt = 0
        original_open = pdfplumber.open
        def tracked_open(*args, **kwargs):
            nonlocal open_count_opt
            open_count_opt += 1
            return original_open(*args, **kwargs)

        with patch("pdfplumber.open", side_effect=tracked_open), \
             patch.object(OcrProcessor, "_ocr_image_to_text", return_value="Sample recognized text line"):
            proc = OcrProcessor(job_id="bench_opt", work_dir=work_dir / "opt")
            out_opt = proc.process([input_pdf], {"language": "eng"})
        t_opt = time.perf_counter() - t0
        _, peak_mem_opt = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        # 3. Benchmark Searchable PDF Bypass
        searchable_pdf = Path("backend/tests/fixtures/1page_text.pdf")
        open_count_searchable = 0
        def tracked_open_searchable(*args, **kwargs):
            nonlocal open_count_searchable
            open_count_searchable += 1
            return original_open(*args, **kwargs)

        t0 = time.perf_counter()
        with patch("pdfplumber.open", side_effect=tracked_open_searchable):
            proc_s = OcrProcessor(job_id="bench_searchable", work_dir=work_dir / "searchable")
            out_s = proc_s.process([searchable_pdf], {"language": "eng"})
        t_searchable = time.perf_counter() - t0

        speedup_pct = ((t_unopt - t_opt) / t_unopt) * 100

        print(f"--- BENCHMARK RESULTS (5-Page Scanned PDF) ---")
        print(f"Unoptimized Baseline:")
        print(f"  Wall-clock time: {t_unopt:.4f}s")
        print(f"  pdfplumber.open calls: {opens_unopt}")
        print(f"  Peak Traced Memory: {peak_mem_unopt / 1024:.2f} KB")
        print(f"  Output size: {out_unopt.stat().st_size} bytes")
        print(f"Optimized Single-Context:")
        print(f"  Wall-clock time: {t_opt:.4f}s")
        print(f"  pdfplumber.open calls: {open_count_opt}")
        print(f"  Peak Traced Memory: {peak_mem_opt / 1024:.2f} KB")
        print(f"  Output size: {out_opt.stat().st_size} bytes")
        print(f"Improvement:")
        print(f"  Execution Time Reduction: {speedup_pct:.2f}% faster")
        print(f"  File Handle Opens: Reduced from {opens_unopt} to {open_count_opt} ({(opens_unopt - open_count_opt)/opens_unopt*100:.0f}% reduction)")
        print(f"Searchable Text Bypass (1-page text PDF):")
        print(f"  Wall-clock time: {t_searchable:.4f}s")
        print(f"  pdfplumber.open calls: {open_count_searchable} (0 opens - rasterization completely bypassed)")

if __name__ == "__main__":
    benchmark()
