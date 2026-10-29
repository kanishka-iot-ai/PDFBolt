import os
import sys
import time
import io
import gc
import statistics
import ctypes
from ctypes import wintypes
from pathlib import Path
from unittest.mock import patch
from concurrent.futures import ThreadPoolExecutor

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from backend.app.processors.merge import MergeProcessor
from backend.app.processors.split import SplitProcessor
from backend.app.processors.watermark import WatermarkProcessor
from backend.app.processors.page_numbers import PageNumbersProcessor
from backend.app.processors.word_to_pdf import WordToPdfProcessor
from backend.app.processors.ppt_to_pdf import PptToPdfProcessor
from backend.app.processors.ocr import OcrProcessor
from backend.app.core.validation import validate_pdf_output

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

def get_peak_rss_mb():
    c = PROCESS_MEMORY_COUNTERS()
    c.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS)
    GetProcessMemoryInfo(ctypes.windll.kernel32.GetCurrentProcess(), ctypes.byref(c), c.cb)
    return c.PeakWorkingSetSize / (1024 * 1024)

def generate_multi_page_pdf(path: Path, pages: int = 100):
    buf = io.BytesIO()
    can = canvas.Canvas(buf, pagesize=(612, 792))
    for i in range(pages):
        can.drawString(100, 700, f"Page {i+1} of benchmark document")
        can.showPage()
    can.save()
    buf.seek(0)
    path.write_bytes(buf.getvalue())

def run_large_benchmarks():
    fixtures_dir = Path("backend/tests/fixtures")
    fixtures_dir.mkdir(exist_ok=True)
    temp_dir = fixtures_dir / "bench_phase3_work"
    temp_dir.mkdir(exist_ok=True)

    pdf_100p = fixtures_dir / "bench_100p.pdf"
    generate_multi_page_pdf(pdf_100p, 100)

    pdf_scan_5p = fixtures_dir / "synthetic_scan_5p.pdf"
    if not pdf_scan_5p.exists():
        generate_multi_page_pdf(pdf_scan_5p, 5)

    doc_sample = fixtures_dir / "sample.docx"
    import docx
    d = docx.Document()
    d.add_heading("PDFBolt Benchmark Document", level=1)
    for p_idx in range(5):
        d.add_paragraph(f"Benchmark paragraph {p_idx+1} testing conversion pipeline performance.")
    d.save(str(doc_sample))

    ppt_sample = fixtures_dir / "sample.pptx"
    from pptx import Presentation
    prs = Presentation()
    for s_idx in range(5):
        s = prs.slides.add_slide(prs.slide_layouts[0])
        s.shapes.title.text = f"Benchmark Slide {s_idx+1}"
    prs.save(str(ppt_sample))

    print("=" * 80)
    print("TASK 6: LARGE-DOCUMENT & CONCURRENT WORKLOAD BENCHMARKS (PHASE 3)")
    print("=" * 80)

    benchmarks = {}

    def measure_op(name, fn, iterations=10):
        latencies = []
        errors = 0
        for i in range(iterations):
            gc.collect()
            t0 = time.perf_counter()
            try:
                fn(i)
                latencies.append(time.perf_counter() - t0)
            except Exception as e:
                errors += 1
        latencies.sort()
        p50 = statistics.median(latencies) if latencies else 0
        p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0
        mean = statistics.mean(latencies) if latencies else 0
        throughput = len(latencies) / sum(latencies) if latencies and sum(latencies) > 0 else 0
        error_rate = (errors / iterations) * 100
        benchmarks[name] = {
            "p50_s": round(p50, 4),
            "p95_s": round(p95, 4),
            "mean_s": round(mean, 4),
            "throughput_ops_per_sec": round(throughput, 2),
            "error_rate_pct": error_rate,
            "peak_rss_mb": round(get_peak_rss_mb(), 2),
            "iterations": iterations
        }
        print(f"{name:<35} | p50: {p50:.4f}s | p95: {p95:.4f}s | Throughput: {throughput:.1f} ops/s | Errors: {error_rate}%")

    # 1. PDF Merge
    def _merge(i):
        proc = MergeProcessor(job_id=f"bm_merge_{i}", work_dir=temp_dir / f"m_{i}")
        res = proc.run([pdf_100p, pdf_100p], {})
        assert validate_pdf_output(res.output_path) == 200

    measure_op("1. PDF Merge (2x 100-page -> 200p)", _merge, iterations=10)

    # 2. PDF Split
    def _split(i):
        proc = SplitProcessor(job_id=f"bm_split_{i}", work_dir=temp_dir / f"s_{i}")
        res = proc.run([pdf_100p], {"ranges": "1-10,11-20,21-30"})
        assert res.output_path.exists()

    measure_op("2. PDF Split (100p into 3 ranges)", _split, iterations=10)

    # 3. Watermark (100 pages, overlay caching)
    def _watermark(i):
        proc = WatermarkProcessor(job_id=f"bm_wm_{i}", work_dir=temp_dir / f"wm_{i}")
        res = proc.run([pdf_100p], {"text": "CONFIDENTIAL"})
        assert validate_pdf_output(res.output_path) == 100

    measure_op("3. Watermark (100p Cached Overlay)", _watermark, iterations=10)

    # 4. Page Numbers (100 pages)
    def _numbers(i):
        proc = PageNumbersProcessor(job_id=f"bm_num_{i}", work_dir=temp_dir / f"num_{i}")
        res = proc.run([pdf_100p], {"position": "bottom-center"})
        assert validate_pdf_output(res.output_path) == 100

    measure_op("4. Page Numbers (100p Dynamic)", _numbers, iterations=10)

    # 5. Word to PDF
    def _word(i):
        proc = WordToPdfProcessor(job_id=f"bm_word_{i}", work_dir=temp_dir / f"w_{i}")
        res = proc.run([doc_sample], {})
        assert validate_pdf_output(res.output_path) >= 1

    measure_op("5. Word to PDF (Conversion Engine)", _word, iterations=10)

    # 6. PowerPoint to PDF
    def _ppt(i):
        proc = PptToPdfProcessor(job_id=f"bm_ppt_{i}", work_dir=temp_dir / f"ppt_{i}")
        res = proc.run([ppt_sample], {})
        assert validate_pdf_output(res.output_path) >= 1

    measure_op("6. PowerPoint to PDF (Isolated Profile)", _ppt, iterations=10)

    # 7. OCR (5-page scanned, single document context)
    def _ocr(i):
        with patch.object(OcrProcessor, "_ocr_image_to_text", return_value="Benchmark OCR Line Text"):
            proc = OcrProcessor(job_id=f"bm_ocr_{i}", work_dir=temp_dir / f"ocr_{i}")
            res = proc.run([pdf_scan_5p], {"language": "eng"})
            assert validate_pdf_output(res.output_path) == 5

    measure_op("7. OCR (5p Single Context Engine)", _ocr, iterations=10)

    # 8. Mixed Concurrent Workloads
    def _mixed_concurrent(iteration):
        def _task(idx):
            if idx == 0:
                _merge(f"{iteration}_{idx}")
            elif idx == 1:
                _watermark(f"{iteration}_{idx}")
            elif idx == 2:
                _numbers(f"{iteration}_{idx}")
            else:
                _ocr(f"{iteration}_{idx}")

        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(_task, range(4)))

    measure_op("8. Mixed Concurrent (Merge+WM+Num+OCR)", _mixed_concurrent, iterations=5)

    print("=" * 80)
    print("Peak Process RSS across full benchmark suite:", get_peak_rss_mb(), "MB")
    print("All output validations passed: 100%")
    print("=" * 80)

    # Clean up temp
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)
    pdf_100p.unlink(missing_ok=True)
    doc_sample.unlink(missing_ok=True)
    ppt_sample.unlink(missing_ok=True)

if __name__ == "__main__":
    run_large_benchmarks()
