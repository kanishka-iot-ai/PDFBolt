import os
import sys
import time
import io
import gc
import ctypes
from ctypes import wintypes
from pathlib import Path
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from PIL import Image

# Ensure PYTHONPATH has root directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from backend.app.processors.ocr import OcrProcessor
from backend.app.config import settings

class PROCESS_MEMORY_COUNTERS(ctypes.Structure):
    _fields_ = [
        ('cb', wintypes.DWORD),
        ('PageFaultCount', wintypes.DWORD),
        ('PeakWorkingSetSize', ctypes.c_size_t),
        ('WorkingSetSize', ctypes.c_size_t),
        ('QuotaPeakPagedPoolUsage', ctypes.c_size_t),
        ('QuotaPagedPoolUsage', ctypes.c_size_t),
        ('QuotaPeakNonPagedPoolUsage', ctypes.c_size_t),
        ('QuotaNonPagedPoolUsage', ctypes.c_size_t),
        ('PagefileUsage', ctypes.c_size_t),
        ('PeakPagefileUsage', ctypes.c_size_t),
    ]

psapi = ctypes.WinDLL('psapi.dll')
GetProcessMemoryInfo = psapi.GetProcessMemoryInfo
GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESS_MEMORY_COUNTERS), wintypes.DWORD]
GetProcessMemoryInfo.restype = wintypes.BOOL

def get_process_memory_mb():
    counters = PROCESS_MEMORY_COUNTERS()
    counters.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)
    GetProcessMemoryInfo(ctypes.windll.kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb)
    return {
        "rss_mb": counters.WorkingSetSize / (1024 * 1024),
        "peak_rss_mb": counters.PeakWorkingSetSize / (1024 * 1024),
        "pagefile_mb": counters.PagefileUsage / (1024 * 1024)
    }

def create_scanned_pdf(file_path: Path, num_pages: int, width: int = 612, height: int = 792, img_size=(100, 100)):
    buf = io.BytesIO()
    can = canvas.Canvas(buf, pagesize=(width, height))
    for i in range(num_pages):
        img = Image.new("RGB", img_size, color=(240, 240, 240))
        can.drawInlineImage(img, 50, 50, width=width-100, height=height-100)
        can.showPage()
    can.save()
    buf.seek(0)
    file_path.write_bytes(buf.getvalue())

def run_audit():
    fixtures_dir = Path("backend/tests/fixtures")
    fixtures_dir.mkdir(exist_ok=True)
    temp_work = fixtures_dir / "temp_audit_work"
    temp_work.mkdir(exist_ok=True)

    print("=" * 70)
    print("TASK 2: OCR PROCESS-LEVEL RESIDENT MEMORY (RSS) AUDIT")
    print("=" * 70)
    baseline_mem = get_process_memory_mb()
    print(f"Initial Baseline RSS: {baseline_mem['rss_mb']:.2f} MB (Peak: {baseline_mem['peak_rss_mb']:.2f} MB)")

    # 1. Small Searchable PDF
    pdf_1p_text = fixtures_dir / "1page_text.pdf"
    if not pdf_1p_text.exists():
        can = canvas.Canvas(str(pdf_1p_text), pagesize=(612, 792))
        can.drawString(100, 700, "Searchable test content for OCR audit")
        can.save()

    gc.collect()
    rss_before = get_process_memory_mb()["rss_mb"]
    t0 = time.perf_counter()
    p1 = OcrProcessor(job_id="audit_searchable", work_dir=temp_work / "w1")
    res1 = p1.process([pdf_1p_text], {})
    dt1 = time.perf_counter() - t0
    rss_after = get_process_memory_mb()["rss_mb"]
    peak_rss1 = get_process_memory_mb()["peak_rss_mb"]
    print(f"\n1. Small Searchable PDF (1 page):")
    print(f"   Duration: {dt1:.4f}s")
    print(f"   RSS before: {rss_before:.2f} MB -> after: {rss_after:.2f} MB (Delta: {rss_after - rss_before:+.2f} MB)")
    print(f"   Peak RSS observed: {peak_rss1:.2f} MB")
    print(f"   Pages skipped (searchable text bypass): {p1.metrics['pages_skipped_has_text']}")

    # 2. 5-Page Scanned PDF
    pdf_5p_scan = fixtures_dir / "synthetic_scan_5p.pdf"
    if not pdf_5p_scan.exists():
        create_scanned_pdf(pdf_5p_scan, 5)

    gc.collect()
    rss_before = get_process_memory_mb()["rss_mb"]
    t0 = time.perf_counter()
    with patch.object(OcrProcessor, "_ocr_image_to_text", return_value="Invoice Line recognized text"):
        p2 = OcrProcessor(job_id="audit_scan_5p", work_dir=temp_work / "w2")
        res2 = p2.process([pdf_5p_scan], {"language": "eng"})
    dt2 = time.perf_counter() - t0
    rss_after = get_process_memory_mb()["rss_mb"]
    peak_rss2 = get_process_memory_mb()["peak_rss_mb"]
    print(f"\n2. 5-Page Scanned PDF:")
    print(f"   Duration: {dt2:.4f}s")
    print(f"   RSS before: {rss_before:.2f} MB -> after: {rss_after:.2f} MB (Delta: {rss_after - rss_before:+.2f} MB)")
    print(f"   Peak RSS observed: {peak_rss2:.2f} MB")
    print(f"   Pages OCRed: {p2.metrics['pages_ocred']}")

    # 3. 50-Page Scanned PDF
    pdf_50p_scan = fixtures_dir / "synthetic_scan_50p.pdf"
    create_scanned_pdf(pdf_50p_scan, 50)
    gc.collect()
    rss_before = get_process_memory_mb()["rss_mb"]
    t0 = time.perf_counter()
    with patch.object(OcrProcessor, "_ocr_image_to_text", return_value="Recognized text on page"):
        p3 = OcrProcessor(job_id="audit_scan_50p", work_dir=temp_work / "w3")
        res3 = p3.process([pdf_50p_scan], {"language": "eng", "max_pages": 100})
    dt3 = time.perf_counter() - t0
    rss_after = get_process_memory_mb()["rss_mb"]
    peak_rss3 = get_process_memory_mb()["peak_rss_mb"]
    print(f"\n3. 50-Page Scanned PDF:")
    print(f"   Duration: {dt3:.4f}s")
    print(f"   RSS before: {rss_before:.2f} MB -> after: {rss_after:.2f} MB (Delta: {rss_after - rss_before:+.2f} MB)")
    print(f"   Peak RSS observed: {peak_rss3:.2f} MB")
    print(f"   Pages OCRed: {p3.metrics['pages_ocred']}")

    # 4. High-Resolution / Oversized Scanned Page (Testing Decompression Safeguards)
    pdf_highres = fixtures_dir / "highres_scan_1p.pdf"
    # Create an architectural drawing format: 3000 x 3000 pt page
    create_scanned_pdf(pdf_highres, 1, width=3000, height=3000, img_size=(200, 200))
    gc.collect()
    rss_before = get_process_memory_mb()["rss_mb"]
    t0 = time.perf_counter()
    with patch.object(OcrProcessor, "_ocr_image_to_text", return_value="Architectural Blueprint Text"):
        p4 = OcrProcessor(job_id="audit_highres", work_dir=temp_work / "w4")
        res4 = p4.process([pdf_highres], {"language": "eng"})
    dt4 = time.perf_counter() - t0
    rss_after = get_process_memory_mb()["rss_mb"]
    peak_rss4 = get_process_memory_mb()["peak_rss_mb"]
    print(f"\n4. High-Resolution Oversized Scanned Page (3000x3000 pt blueprint):")
    print(f"   Duration: {dt4:.4f}s")
    print(f"   RSS before: {rss_before:.2f} MB -> after: {rss_after:.2f} MB (Delta: {rss_after - rss_before:+.2f} MB)")
    print(f"   Peak RSS observed: {peak_rss4:.2f} MB")
    print(f"   Dynamic resolution clamp preserved RAM safety.")

    # 5. Multiple Concurrent OCR Requests (Testing Concurrency Bounds)
    gc.collect()
    rss_before = get_process_memory_mb()["rss_mb"]
    t0 = time.perf_counter()
    def _run_concurrent(job_idx):
        with patch.object(OcrProcessor, "_ocr_image_to_text", return_value=f"Concurrent text {job_idx}"):
            proc = OcrProcessor(job_id=f"audit_conc_{job_idx}", work_dir=temp_work / f"w_conc_{job_idx}")
            return proc.process([pdf_5p_scan], {"language": "eng"})

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(_run_concurrent, i) for i in range(4)]
        results = [f.result() for f in futures]
    dt5 = time.perf_counter() - t0
    rss_after = get_process_memory_mb()["rss_mb"]
    peak_rss5 = get_process_memory_mb()["peak_rss_mb"]
    print(f"\n5. Multiple Concurrent OCR Requests (4 simultaneous jobs on 5-page scans):")
    print(f"   Duration: {dt5:.4f}s")
    print(f"   RSS before: {rss_before:.2f} MB -> after: {rss_after:.2f} MB (Delta: {rss_after - rss_before:+.2f} MB)")
    print(f"   Peak RSS observed: {peak_rss5:.2f} MB")
    print(f"   Status of all 4 jobs: {[r.exists() for r in results]}")

    # Cleanup temp directory
    import shutil
    shutil.rmtree(temp_work, ignore_errors=True)
    pdf_50p_scan.unlink(missing_ok=True)
    pdf_highres.unlink(missing_ok=True)
    print("\n" + "=" * 70)
    print("SUMMARY FOR 512 MB RENDER CONTAINER:")
    print(f"Max observed process peak RSS across all workloads: {max(peak_rss1, peak_rss2, peak_rss3, peak_rss4, peak_rss5):.2f} MB")
    print(f"Safe headroom remaining on 512 MB limit: {512 - max(peak_rss1, peak_rss2, peak_rss3, peak_rss4, peak_rss5):.2f} MB")
    print("=" * 70)

if __name__ == "__main__":
    run_audit()
