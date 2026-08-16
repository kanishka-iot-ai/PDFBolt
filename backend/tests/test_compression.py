import pytest
from backend.app.processors.compress import CompressProcessor


def test_compression_regression_small_pdf(tiny_pdf_bytes):
    """
    CRITICAL REGRESSION TEST:
    Verifies that when a ~75 KB document is processed, if generated output
    would be larger than or equal to the input, the engine:
    1. Rejects the oversized output
    2. Preserves the original file bytes
    3. Returns saved_bytes = 0 and is_reduced = False
    4. Never claims false compression success
    """
    orig_size = len(tiny_pdf_bytes)
    processor = CompressProcessor(settings={"profile": "balanced"})
    out_bytes, out_name, metrics = processor.process(tiny_pdf_bytes, "report.pdf")

    # Invariant: Output size MUST never exceed input size when reported
    assert len(out_bytes) <= orig_size
    assert metrics["original_size_bytes"] == orig_size
    
    if metrics["is_reduced"]:
        assert metrics["output_size_bytes"] < orig_size
        assert metrics["saved_bytes"] > 0
        assert metrics["reduction_percent"] > 0.0
    else:
        assert metrics["saved_bytes"] == 0
        assert metrics["reduction_percent"] == 0.0
        assert metrics["output_size_bytes"] == orig_size
        assert out_bytes == tiny_pdf_bytes  # Preserved original!


def test_image_heavy_pdf_compression(image_heavy_pdf_bytes):
    orig_size = len(image_heavy_pdf_bytes)
    processor = CompressProcessor(settings={"profile": "balanced"})
    out_bytes, out_name, metrics = processor.process(image_heavy_pdf_bytes, "photos.pdf")

    # Invariant: Output is a valid non-empty PDF
    assert out_bytes.startswith(b"%PDF-")
    assert metrics["original_size_bytes"] == orig_size
    assert "saved_bytes" in metrics
    assert "reduction_percent" in metrics


def test_compression_profiles(multi_page_pdf_bytes):
    profiles = ["max", "high", "balanced", "high_compression", "extreme"]
    for p in profiles:
        proc = CompressProcessor(settings={"profile": p})
        out_bytes, out_name, metrics = proc.process(multi_page_pdf_bytes, f"doc_{p}.pdf")
        assert out_bytes.startswith(b"%PDF-")
        assert metrics["original_size_bytes"] == len(multi_page_pdf_bytes)
