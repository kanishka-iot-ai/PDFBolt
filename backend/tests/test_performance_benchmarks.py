import io
import time
import os
import gc
import tracemalloc
import pytest
import pypdf
import fitz  # PyMuPDF
from backend.app.processors.compress import CompressProcessor
from backend.app.processors.merge import MergeProcessor
from backend.app.processors.split import SplitProcessor
from backend.app.processors.rotate import RotateProcessor
from backend.app.processors.delete_pages import DeletePagesProcessor
from backend.app.processors.watermark import WatermarkProcessor
from backend.app.processors.page_number import PageNumberProcessor
from backend.app.processors.protect import ProtectProcessor, UnlockProcessor
from backend.app.processors.pdf_to_word import PDFToWordProcessor
from backend.app.processors.pdf_to_excel import PDFToExcelProcessor
from backend.app.processors.pdf_to_ppt import PDFToPPTProcessor
from backend.app.processors.analyzer import PDFAnalyzer


def create_synthetic_pdf(num_pages: int, image_heavy: bool = False, scanned: bool = False) -> bytes:
    doc = fitz.open()
    for p in range(num_pages):
        page = doc.new_page(width=595, height=842)
        if not image_heavy and not scanned:
            page.insert_text((50, 80), f"PDFBolt Benchmark Document - Page {p+1}", fontsize=16)
            for line_idx in range(25):
                page.insert_text((50, 120 + line_idx * 20), f"Paragraph line {line_idx+1}: Performance profiling synthetic text dataset with realistic font glyph distributions.", fontsize=10)
        elif image_heavy:
            # Insert a synthetic pixmap bitmap
            pix = fitz.Pixmap(fitz.csRGB, (0, 0, 200, 200), False)
            pix.clear_with(200 if p % 2 == 0 else 100)
            page.insert_image(fitz.Rect(50, 100, 450, 500), pixmap=pix)
            page.insert_text((50, 520), f"Image-heavy page {p+1}", fontsize=12)
        elif scanned:
            # Rasterized page representation
            pix = fitz.Pixmap(fitz.csGRAY, (0, 0, 300, 400), False)
            pix.clear_with(240)
            page.insert_image(fitz.Rect(40, 40, 555, 800), pixmap=pix)
    
    out = io.BytesIO()
    doc.save(out)
    doc.close()
    return out.getvalue()


def test_detailed_compression_matrix():
    print("\n" + "="*80)
    print("COMPRESSION FINAL BENCHMARK MATRIX")
    print("="*80)
    
    test_cases = [
        ("Tiny PDF (1p text)", create_synthetic_pdf(1, image_heavy=False), "balanced"),
        ("Text-only PDF (10p)", create_synthetic_pdf(10, image_heavy=False), "high_compression"),
        ("Image-heavy PDF (5p)", create_synthetic_pdf(5, image_heavy=True), "extreme"),
        ("Scanned PDF (4p)", create_synthetic_pdf(4, scanned=True), "high_compression"),
        ("Large PDF (100p text)", create_synthetic_pdf(100, image_heavy=False), "balanced"),
    ]

    for name, pdf_bytes, profile in test_cases:
        orig_size = len(pdf_bytes)
        proc = CompressProcessor(settings={"profile": profile})
        
        tracemalloc.start()
        t0 = time.time()
        out_bytes, out_name, meta = proc.process(pdf_bytes, "test.pdf")
        t_elapsed = (time.time() - t0) * 1000
        current_mem, peak_mem = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        out_size = len(out_bytes)
        saved = meta.get("saved_bytes", 0)
        saved_pct = meta.get("saved_percent", 0.0)
        
        assert out_size <= orig_size, "Output size exceeded original size!"
        assert out_bytes.startswith(b"%PDF-"), "Output is not a valid PDF!"
        
        print(f"[{name:22}] Profile={profile:16} | In={orig_size/1024:7.2f}KB | Out={out_size/1024:7.2f}KB | Saved={saved/1024:6.2f}KB ({saved_pct:5.1f}%) | Time={t_elapsed:6.1f}ms | PeakMem={peak_mem/(1024*1024):4.2f}MB | Status=PASS")


def test_workload_scaling_benchmarks():
    print("\n" + "="*80)
    print("WORKLOAD SCALING BENCHMARKS (SMALL, MEDIUM, LARGE)")
    print("="*80)

    workloads = [
        ("Small Workload (3 pages)", create_synthetic_pdf(3), 3),
        ("Medium Workload (25 pages)", create_synthetic_pdf(25), 25),
        ("Large Workload (100 pages)", create_synthetic_pdf(100), 100),
    ]

    for label, doc_bytes, page_count in workloads:
        size_kb = len(doc_bytes) / 1024
        print(f"\n--- {label} (Size: {size_kb:.1f} KB, Pages: {page_count}) ---")
        
        # 1. Analyze
        t0 = time.time()
        res_ana = PDFAnalyzer().analyze(doc_bytes, "test.pdf")
        t_ana = (time.time() - t0) * 1000
        assert res_ana.page_count == page_count
        print(f"  • Analyzer        : {t_ana:6.1f} ms | Pages Verified: {res_ana.page_count}")

        # 2. Merge (Duplication)
        t0 = time.time()
        out_m, _, meta_m = MergeProcessor().process_multiple([(doc_bytes, "d1.pdf"), (doc_bytes, "d2.pdf")])
        t_m = (time.time() - t0) * 1000
        assert meta_m["total_pages"] == page_count * 2
        print(f"  • Merge (2x Docs) : {t_m:6.1f} ms | Output Pages: {meta_m['total_pages']}")

        # 3. Rotate
        t0 = time.time()
        out_r, _, _ = RotateProcessor(settings={"angle": 90}).process(doc_bytes, "test.pdf")
        t_r = (time.time() - t0) * 1000
        print(f"  • Rotate 90°      : {t_r:6.1f} ms | Output Size: {len(out_r)/1024:.1f} KB")

        # 4. Watermark
        t0 = time.time()
        out_w, _, _ = WatermarkProcessor(settings={"text": "OFFICIAL BENCHMARK"}).process(doc_bytes, "test.pdf")
        t_w = (time.time() - t0) * 1000
        print(f"  • Watermark       : {t_w:6.1f} ms | Stamped Pages: {page_count}")

        # 5. Page Numbering
        t0 = time.time()
        out_pn, _, _ = PageNumberProcessor(settings={"position": "bottom-right"}).process(doc_bytes, "test.pdf")
        t_pn = (time.time() - t0) * 1000
        print(f"  • Page Numbers    : {t_pn:6.1f} ms | Numbered Pages: {page_count}")

        # 6. Protect / Unlock
        t0 = time.time()
        out_p, _, _ = ProtectProcessor(settings={"password": "TestPass2026!"}).process(doc_bytes, "test.pdf")
        t_p = (time.time() - t0) * 1000
        
        t0 = time.time()
        out_u, _, _ = UnlockProcessor(settings={"password": "TestPass2026!"}).process(out_p, "test.pdf")
        t_u = (time.time() - t0) * 1000
        print(f"  • AES-256 Crypto  : Encrypt={t_p:5.1f} ms, Decrypt={t_u:5.1f} ms")

        # 7. PDF -> Word (DOCX)
        t0 = time.time()
        out_docx, _, _ = PDFToWordProcessor().process(doc_bytes, "test.pdf")
        t_docx = (time.time() - t0) * 1000
        assert out_docx.startswith(b"PK\x03\x04")
        print(f"  • PDF → DOCX      : {t_docx:6.1f} ms | Output Size: {len(out_docx)/1024:.1f} KB")

        # 8. PDF -> Excel (XLSX)
        t0 = time.time()
        out_xlsx, _, _ = PDFToExcelProcessor().process(doc_bytes, "test.pdf")
        t_xlsx = (time.time() - t0) * 1000
        assert out_xlsx.startswith(b"PK\x03\x04")
        print(f"  • PDF → XLSX      : {t_xlsx:6.1f} ms | Output Size: {len(out_xlsx)/1024:.1f} KB")

        # 9. PDF -> PPTX
        t0 = time.time()
        out_pptx, _, _ = PDFToPPTProcessor().process(doc_bytes, "test.pdf")
        t_pptx = (time.time() - t0) * 1000
        assert out_pptx.startswith(b"PK\x03\x04")
        print(f"  • PDF → PPTX      : {t_pptx:6.1f} ms | Output Size: {len(out_pptx)/1024:.1f} KB")
