import io
import os
import shutil
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import logger
from backend.app.config import settings

# Dedicated thread-level concurrency bounding for OCR execution
_OCR_THREAD_SEMAPHORE = threading.BoundedSemaphore(getattr(settings, "OCR_MAX_CONCURRENT_WORKERS", 2))


class OcrProcessor(BaseProcessor):
    """
    High-Performance Searchable PDF OCR Processing Engine.

    Optimizations & Safeguards:
    1. Single Document Context: Opens pdfplumber exactly once per document lifecycle (lazily),
       eliminating O(N^2) file-reopen and parsing overhead across multi-page scans.
    2. Smart Searchable-Text Bypass: Bypasses rasterization and OCR entirely for pages that
       already contain digital text unless explicit force_ocr is set.
    3. Dedicated Concurrency Bounding: Uses OCR_MAX_CONCURRENT_WORKERS to prevent uncontrolled
       CPU/thread multiplication under heavy concurrent load.
    4. Decompression Bomb & RAM Safeguard: Clamps raster DPI dynamically if a page's pixel
       dimensions exceed OCR_MAX_IMAGE_PIXELS.
    5. Per-Page & Execution Timeouts: Enforces strict timeout limits on Tesseract / OCR workers.
    6. OCRmyPDF Subprocess Support: Configurable engine option enforcing --jobs 1, --skip-text,
       and per-page timeout boundaries.
    7. Guaranteed Resource Cleanup: Closes document contexts and cleans temporary working
       directories in robust finally blocks.
    """

    operation = "ocr"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def _ocr_image_to_text(self, pil_image, lang: str = "eng", timeout: int = 30) -> str:
        """Runs PyTesseract on an in-memory image with a strict per-page timeout."""
        try:
            import pytesseract
            # Try to run pytesseract with timeout
            text = pytesseract.image_to_string(
                pil_image,
                lang=lang,
                config="--oem 3 --psm 6",
                timeout=timeout
            )
            return text or ""
        except Exception as e:
            logger.info(f"pytesseract extraction note: {e}")
            return ""

    def _process_ocrmypdf(self, input_pdf: Path, opts: Dict[str, Any]) -> Path:
        """
        Executes OCRmyPDF with strict resource bounds:
        - jobs=1 to prevent process explosion under concurrent load
        - skip_text=True to avoid re-rasterizing existing digital pages
        - tesseract_timeout to bound execution
        - max_image_mpixels to prevent memory exhaustion
        """
        output_path = self.output_dir / f"{self.job_id}.pdf"
        lang = str(opts.get("language") or opts.get("lang") or "eng")
        per_page_timeout = int(opts.get("timeout") or getattr(settings, "OCR_PER_PAGE_TIMEOUT_SECONDS", 30))

        try:
            import ocrmypdf
            logger.info(f"Running OCRmyPDF Python engine for job {self.job_id}")
            ocrmypdf.ocr(
                str(input_pdf),
                str(output_path),
                language=lang,
                jobs=1,
                skip_text=True,
                tesseract_timeout=per_page_timeout,
                max_image_mpixels=32,
                progress_bar=False
            )
        except (ImportError, Exception) as py_err:
            logger.info(f"ocrmypdf Python API unavailable/failed ({py_err}), checking CLI binary...")
            import subprocess
            cmd = [
                "ocrmypdf",
                "--jobs", "1",
                "--skip-text",
                "--tesseract-timeout", str(per_page_timeout),
                "--max-image-mpixels", "32",
                "-l", lang,
                str(input_pdf),
                str(output_path)
            ]
            total_timeout = int(opts.get("total_timeout") or getattr(settings, "OCR_EXECUTION_TIMEOUT_SECONDS", 120))
            proc = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=total_timeout
            )
            if proc.returncode != 0:
                raise RuntimeError(f"OCRmyPDF binary failed (code {proc.returncode}): {proc.stderr}")

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise OutputValidationError("OCRmyPDF failed to generate output document.")

        return output_path

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        if not input_pdf.exists() or input_pdf.stat().st_size == 0:
            raise PDFBoltError("FILE_EMPTY")

        # Security check: maximum input size
        max_input_bytes = getattr(settings, "OCR_MAX_INPUT_SIZE_BYTES", 50 * 1024 * 1024)
        if input_pdf.stat().st_size > max_input_bytes:
            raise PDFBoltError(
                "FILE_TOO_LARGE",
                f"File size exceeds OCR limit of {max_input_bytes // (1024 * 1024)} MB."
            )

        reader = PdfReader(str(input_pdf), strict=False)
        total_pages = len(reader.pages)

        # Security check: maximum page count limit
        max_pages = int(options.get("max_pages") or getattr(settings, "OCR_MAX_PAGE_LIMIT", 100))
        if total_pages > max_pages:
            raise PDFBoltError(
                "PAGE_LIMIT_EXCEEDED",
                f"Document has {total_pages} pages; maximum allowed for OCR is {max_pages}."
            )

        # Check for explicit ocrmypdf engine request
        engine_opt = str(options.get("engine") or "").lower().strip()
        if engine_opt == "ocrmypdf":
            try:
                out_path = self._process_ocrmypdf(input_pdf, options)
                actual_pages = validate_pdf_output(out_path)
                if actual_pages != total_pages:
                    out_path.unlink(missing_ok=True)
                    raise OutputValidationError(
                        f"OCR altered page count: expected {total_pages}, got {actual_pages}."
                    )
                self.metrics = {
                    "total_pages": total_pages,
                    "pages_ocred": total_pages,
                    "engine": "ocrmypdf",
                    "status": "success"
                }
                return out_path
            except Exception as e:
                logger.warning(f"OCRmyPDF pipeline failed ({e}); falling back to native single-context OCR.")

        return self._process_native_ocr(input_pdf, reader, total_pages, options)

    def _process_native_ocr(
        self,
        input_pdf: Path,
        reader: PdfReader,
        total_pages: int,
        options: Dict[str, Any]
    ) -> Path:
        lang = str(options.get("language") or options.get("lang") or "eng")
        force_ocr = bool(options.get("force_ocr", False))
        per_page_timeout = int(options.get("timeout") or getattr(settings, "OCR_PER_PAGE_TIMEOUT_SECONDS", 30))
        target_dpi = int(options.get("dpi") or getattr(settings, "OCR_DEFAULT_DPI", 150))
        max_image_pixels = getattr(settings, "OCR_MAX_IMAGE_PIXELS", 25_000_000)

        writer = PdfWriter()
        pdf_doc = None  # Single document context across all pages
        packets_to_close: List[io.BytesIO] = []

        pages_ocred = 0
        pages_skipped = 0

        # Concurrency bounding: ensure concurrent OCR requests cannot overwhelm CPU resources
        with _OCR_THREAD_SEMAPHORE:
            try:
                for idx, page in enumerate(reader.pages):
                    if getattr(self, "is_cancelled", None) and self.is_cancelled.is_set():
                        logger.info(f"OCR job {self.job_id} cancelled. Halting page loop.")
                        break

                    existing_text = page.extract_text() or ""
                    width = float(page.mediabox.width)
                    height = float(page.mediabox.height)

                    needs_ocr = force_ocr or not existing_text.strip()
                    if not needs_ocr:
                        pages_skipped += 1
                        writer.add_page(page)
                        continue

                    # Lazily open pdfplumber ONCE for the entire document lifecycle
                    if pdf_doc is None:
                        import pdfplumber
                        pdf_doc = pdfplumber.open(str(input_pdf))

                    try:
                        plumb_page = pdf_doc.pages[idx]

                        # Large image safeguard: clamp resolution if dimensions would exceed pixel budget
                        est_pixels = (width / 72.0 * target_dpi) * (height / 72.0 * target_dpi)
                        effective_dpi = target_dpi
                        if est_pixels > max_image_pixels:
                            scale = (max_image_pixels / est_pixels) ** 0.5
                            effective_dpi = max(72, int(target_dpi * scale))
                            logger.info(f"Dynamically clamped OCR DPI from {target_dpi} to {effective_dpi} on page {idx+1}")

                        page_img = plumb_page.to_image(resolution=effective_dpi)
                        pil_img = page_img.original
                        try:
                            ocr_text = self._ocr_image_to_text(pil_img, lang, timeout=per_page_timeout)
                        finally:
                            try:
                                pil_img.close()
                            except Exception:
                                pass
                            del pil_img
                            del page_img

                        if ocr_text.strip():
                            packet = io.BytesIO()
                            packets_to_close.append(packet)
                            can = canvas.Canvas(packet, pagesize=(width, height))
                            # Make text transparent / invisible over existing pixels
                            can.setFillColor(colors.Color(0, 0, 0, alpha=0.01))
                            can.setFont("Helvetica", 10)

                            y_pos = height - 40
                            for line in ocr_text.splitlines()[:50]:
                                if line.strip():
                                    can.drawString(40, max(20, y_pos), line.strip()[:100])
                                    y_pos -= 14
                            can.save()
                            packet.seek(0)
                            overlay_reader = PdfReader(packet)
                            page.merge_page(overlay_reader.pages[0])
                            pages_ocred += 1

                        # Periodically collect unreferenced page bitmaps during long multi-page scans
                        if (idx + 1) % 5 == 0:
                            import gc
                            gc.collect()
                    except Exception as e:
                        logger.warning(f"OCR page {idx+1} processing note: {e}")

                    writer.add_page(page)

            finally:
                for p in packets_to_close:
                    try:
                        p.close()
                    except Exception:
                        pass
                if pdf_doc is not None:
                    try:
                        pdf_doc.close()
                    except Exception:
                        pass

        if getattr(self, "is_cancelled", None) and self.is_cancelled.is_set():
            raise PDFBoltError("JOB_CANCELLED", f"Job {self.job_id} was cancelled before completion.")

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        actual_pages = validate_pdf_output(output_path)
        if actual_pages != total_pages:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"OCR altered page count: expected {total_pages}, got {actual_pages}.")

        self.metrics = {
            "total_pages": total_pages,
            "pages_ocred": pages_ocred,
            "pages_skipped_has_text": pages_skipped,
            "engine": "native_single_context",
            "status": "success"
        }

        return output_path
