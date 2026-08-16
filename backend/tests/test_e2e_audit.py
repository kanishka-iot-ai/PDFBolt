import io
import time
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
from backend.app.validators.input_validator import InputValidator
from backend.app.core.security import sanitize_filename

def create_sample_pdf(num_pages=4, with_text=True) -> bytes:
    doc = fitz.open()
    for i in range(num_pages):
        page = doc.new_page(width=595, height=842)
        if with_text:
            page.insert_text((50, 100), f"PDFBolt Test Document - Page {i+1}", fontsize=18)
            page.insert_text((50, 150), f"Detailed paragraph text content for testing page {i+1}.", fontsize=12)
            page.insert_text((50, 200), "Table column A | Table column B | Table column C", fontsize=10)
            page.insert_text((50, 220), "Row 1 Value 100 | Row 1 Value 200 | 2026-08-16", fontsize=10)
            page.insert_text((50, 240), "Row 2 Value 300 | Row 2 Value 400 | 2026-08-17", fontsize=10)
    
    out = io.BytesIO()
    doc.save(out)
    doc.close()
    return out.getvalue()

def test_audit_all_processors_end_to_end():
    sample_pdf = create_sample_pdf(num_pages=4, with_text=True)
    sample_size = len(sample_pdf)
    assert sample_size > 0

    # 1. Compress (Anti-Bloat Guard)
    proc_comp = CompressProcessor(settings={"profile": "balanced"})
    t0 = time.time()
    comp_bytes, comp_name, comp_meta = proc_comp.process(sample_pdf, "test.pdf")
    t_comp = time.time() - t0
    assert len(comp_bytes) > 0
    assert comp_meta["output_size_bytes"] <= comp_meta["original_size_bytes"]
    print(f"\n[BENCHMARK] Compress: In={sample_size}B Out={len(comp_bytes)}B Saved={comp_meta['saved_bytes']}B Time={t_comp*1000:.1f}ms")

    # 2. Merge (4 pages + 4 pages = 8 pages)
    sample_pdf_2 = create_sample_pdf(num_pages=4, with_text=True)
    proc_merge = MergeProcessor()
    t0 = time.time()
    merged_bytes, merged_name, merged_meta = proc_merge.process_multiple([
        (sample_pdf, "doc1.pdf"),
        (sample_pdf_2, "doc2.pdf")
    ])
    t_merge = time.time() - t0
    assert merged_meta["total_pages"] == 8
    print(f"[BENCHMARK] Merge: 2 files -> 8 pages, Out={len(merged_bytes)}B Time={t_merge*1000:.1f}ms")

    # 3. Split (pages 2-3)
    proc_split = SplitProcessor(settings={"range": "2-3"})
    t0 = time.time()
    split_bytes, split_name, split_meta = proc_split.process(sample_pdf, "test.pdf")
    t_split = time.time() - t0
    assert split_meta["extracted_pages"] == 2
    print(f"[BENCHMARK] Split: 4p -> 2p, Out={len(split_bytes)}B Time={t_split*1000:.1f}ms")

    # 4. Rotate (90 deg)
    proc_rot = RotateProcessor(settings={"angle": 90})
    t0 = time.time()
    rot_bytes, rot_name, rot_meta = proc_rot.process(sample_pdf, "test.pdf")
    t_rot = time.time() - t0
    assert len(rot_bytes) > 0
    print(f"[BENCHMARK] Rotate: 4p rotated 90°, Out={len(rot_bytes)}B Time={t_rot*1000:.1f}ms")

    # 5. Delete Pages (remove page 2 -> 3 pages remaining)
    proc_del = DeletePagesProcessor(settings={"pages": "2"})
    t0 = time.time()
    del_bytes, del_name, del_meta = proc_del.process(sample_pdf, "test.pdf")
    t_del = time.time() - t0
    reader = pypdf.PdfReader(io.BytesIO(del_bytes))
    assert len(reader.pages) == 3
    print(f"[BENCHMARK] Delete Pages: 4-1 = 3p, Out={len(del_bytes)}B Time={t_del*1000:.1f}ms")

    # 6. Watermark
    proc_wm = WatermarkProcessor(settings={"text": "CONFIDENTIAL"})
    t0 = time.time()
    wm_bytes, wm_name, wm_meta = proc_wm.process(sample_pdf, "test.pdf")
    t_wm = time.time() - t0
    assert len(wm_bytes) > 0
    print(f"[BENCHMARK] Watermark: Stamped 4p, Out={len(wm_bytes)}B Time={t_wm*1000:.1f}ms")

    # 7. Page Numbers
    proc_pn = PageNumberProcessor(settings={"position": "bottom-right"})
    t0 = time.time()
    pn_bytes, pn_name, pn_meta = proc_pn.process(sample_pdf, "test.pdf")
    t_pn = time.time() - t0
    assert len(pn_bytes) > 0
    print(f"[BENCHMARK] Page Numbers: Numbered 4p, Out={len(pn_bytes)}B Time={t_pn*1000:.1f}ms")

    # 8. Protect & Unlock Lifecycle
    proc_prot = ProtectProcessor(settings={"password": "PDFBoltSecurePassword2026!"})
    t0 = time.time()
    prot_bytes, prot_name, prot_meta = proc_prot.process(sample_pdf, "test.pdf")
    t_prot = time.time() - t0
    
    proc_unl = UnlockProcessor(settings={"password": "PDFBoltSecurePassword2026!"})
    t0 = time.time()
    unl_bytes, unl_name, unl_meta = proc_unl.process(prot_bytes, "test.pdf")
    t_unl = time.time() - t0
    assert len(unl_bytes) > 0
    print(f"[BENCHMARK] Protect/Unlock: Encrypt={t_prot*1000:.1f}ms, Decrypt={t_unl*1000:.1f}ms")

    # 9. PDF to DOCX
    proc_docx = PDFToWordProcessor()
    t0 = time.time()
    docx_bytes, docx_name, docx_meta = proc_docx.process(sample_pdf, "test.pdf")
    t_docx = time.time() - t0
    assert docx_bytes.startswith(b"PK\x03\x04")
    print(f"[BENCHMARK] PDF->DOCX: Out={len(docx_bytes)}B Time={t_docx*1000:.1f}ms")

    # 10. PDF to XLSX
    proc_xlsx = PDFToExcelProcessor()
    t0 = time.time()
    xlsx_bytes, xlsx_name, xlsx_meta = proc_xlsx.process(sample_pdf, "test.pdf")
    t_xlsx = time.time() - t0
    assert xlsx_bytes.startswith(b"PK\x03\x04")
    print(f"[BENCHMARK] PDF->XLSX: Out={len(xlsx_bytes)}B Time={t_xlsx*1000:.1f}ms")

    # 11. PDF to PPTX
    proc_pptx = PDFToPPTProcessor()
    t0 = time.time()
    pptx_bytes, pptx_name, pptx_meta = proc_pptx.process(sample_pdf, "test.pdf")
    t_pptx = time.time() - t0
    assert pptx_bytes.startswith(b"PK\x03\x04")
    print(f"[BENCHMARK] PDF->PPTX: Out={len(pptx_bytes)}B Time={t_pptx*1000:.1f}ms")

    # 12. PDF Analyzer
    analyzer = PDFAnalyzer()
    t0 = time.time()
    analysis = analyzer.analyze(sample_pdf, "test.pdf")
    t_ana = time.time() - t0
    assert analysis.page_count == 4
    assert analysis.is_encrypted is False
    print(f"[BENCHMARK] Analyzer: Pages={analysis.page_count}, Encrypted={analysis.is_encrypted}, Time={t_ana*1000:.1f}ms\n")
