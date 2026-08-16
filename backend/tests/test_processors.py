import pytest
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
import pypdf
import io


def test_merge_page_count_invariant(tiny_pdf_bytes, multi_page_pdf_bytes):
    """Invariant: Output pages must equal sum of input pages."""
    proc = MergeProcessor()
    out_bytes, out_name, metrics = proc.process_multiple([
        (tiny_pdf_bytes, "doc1.pdf"),
        (multi_page_pdf_bytes, "doc2.pdf")
    ])

    reader = pypdf.PdfReader(io.BytesIO(out_bytes))
    assert len(reader.pages) == 6  # 1 page from tiny + 5 from multi_page
    assert metrics["total_pages"] == 6


def test_split_page_range_invariant(multi_page_pdf_bytes):
    """Invariant: Output pages must equal requested range count."""
    proc = SplitProcessor(settings={"range": "2-4"})
    out_bytes, out_name, metrics = proc.process(multi_page_pdf_bytes, "multipage.pdf")

    reader = pypdf.PdfReader(io.BytesIO(out_bytes))
    assert len(reader.pages) == 3  # Pages 2, 3, 4
    assert metrics["extracted_pages"] == 3


def test_rotate_processor(tiny_pdf_bytes):
    proc = RotateProcessor(settings={"angle": 90})
    out_bytes, out_name, metrics = proc.process(tiny_pdf_bytes, "doc.pdf")

    reader = pypdf.PdfReader(io.BytesIO(out_bytes))
    assert len(reader.pages) == 1
    assert reader.pages[0].rotation == 90


def test_delete_pages_processor(multi_page_pdf_bytes):
    proc = DeletePagesProcessor(settings={"pages": "1, 3"})
    out_bytes, out_name, metrics = proc.process(multi_page_pdf_bytes, "doc.pdf")

    reader = pypdf.PdfReader(io.BytesIO(out_bytes))
    assert len(reader.pages) == 3  # 5 - 2 = 3


def test_watermark_processor(tiny_pdf_bytes):
    proc = WatermarkProcessor(settings={"text": "TOP SECRET"})
    out_bytes, out_name, metrics = proc.process(tiny_pdf_bytes, "doc.pdf")
    assert out_bytes.startswith(b"%PDF-")


def test_page_number_processor(multi_page_pdf_bytes):
    proc = PageNumberProcessor(settings={"position": "bottom-right"})
    out_bytes, out_name, metrics = proc.process(multi_page_pdf_bytes, "doc.pdf")
    assert out_bytes.startswith(b"%PDF-")


def test_protect_and_unlock_lifecycle(tiny_pdf_bytes):
    protect_proc = ProtectProcessor(settings={"password": "TestPassword123!"})
    enc_bytes, enc_name, _ = protect_proc.process(tiny_pdf_bytes, "doc.pdf")

    reader = pypdf.PdfReader(io.BytesIO(enc_bytes))
    assert reader.is_encrypted

    unlock_proc = UnlockProcessor(settings={"password": "TestPassword123!"})
    unlocked_bytes, _, _ = unlock_proc.process(enc_bytes, "doc.pdf")

    unlocked_reader = pypdf.PdfReader(io.BytesIO(unlocked_bytes))
    assert not unlocked_reader.is_encrypted


def test_pdf_to_word_conversion(tiny_pdf_bytes):
    proc = PDFToWordProcessor()
    out_bytes, out_name, metrics = proc.process(tiny_pdf_bytes, "doc.pdf")
    assert out_bytes.startswith(b"PK\x03\x04")  # Valid OpenXML container
    assert out_name.endswith(".docx")


def test_pdf_to_excel_conversion(tiny_pdf_bytes):
    proc = PDFToExcelProcessor()
    out_bytes, out_name, metrics = proc.process(tiny_pdf_bytes, "doc.pdf")
    assert out_bytes.startswith(b"PK\x03\x04")  # Valid OpenXML container
    assert out_name.endswith(".xlsx")


def test_pdf_to_ppt_conversion(multi_page_pdf_bytes):
    proc = PDFToPPTProcessor()
    out_bytes, out_name, metrics = proc.process(multi_page_pdf_bytes, "doc.pdf")
    assert out_bytes.startswith(b"PK\x03\x04")  # Valid OpenXML container
    assert out_name.endswith(".pptx")


def test_analyzer_processor(multi_page_pdf_bytes):
    result = PDFAnalyzer.analyze(multi_page_pdf_bytes, "doc.pdf")
    assert result.page_count == 5
    assert result.size_bytes == len(multi_page_pdf_bytes)
    assert len(result.topics) >= 0
