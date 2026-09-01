import io
import os
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
from pypdf import PdfReader, PdfWriter
from PIL import Image

try:
    import pymupdf
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import logger


class CompressProcessor(BaseProcessor):
    operation = "compress"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def _find_ghostscript(self) -> Optional[str]:
        for bin_name in ["gs", "gswin64c", "gswin32c", "ghostscript"]:
            path = shutil.which(bin_name)
            if path:
                return path
        return None

    def _compress_pymupdf(self, input_path: Path, output_path: Path, level: str) -> bool:
        """
        High-efficiency, non-blur compression engine using PyMuPDF and Pillow.
        Preserves 100% native vector text, fonts, links, and layout while 
        intelligently optimizing image streams and deflating PDF objects.
        """
        if not HAS_PYMUPDF:
            return False

        lvl = (level or "BALANCED").upper()
        
        # Quality & Resolution profiles (Never degrades below crisp reading standards)
        if lvl in ("MAX", "LOW"):
            max_dim = 3000   # ~300 DPI
            jpeg_quality = 90
        elif lvl in ("HIGH", "HIGH-COMPRESSION"):
            max_dim = 1800   # ~180 DPI
            jpeg_quality = 80
        elif lvl == "EXTREME":
            max_dim = 1500   # ~150 DPI (Crisp on all mobile/retina screens, non-blur)
            jpeg_quality = 75
        else: # BALANCED / RECOMMENDED / MEDIUM
            max_dim = 2200   # ~220 DPI
            jpeg_quality = 84

        try:
            doc = pymupdf.open(str(input_path))
            processed_xrefs = set()
            all_xrefs: list = []

            # Collect all unique image xrefs first
            for page in doc:
                try:
                    image_list = page.get_images(full=True)
                except Exception:
                    continue
                for img_info in image_list:
                    xref = img_info[0]
                    if xref not in processed_xrefs:
                        processed_xrefs.add(xref)
                        all_xrefs.append(xref)

            # Process all images in parallel using ThreadPoolExecutor
            import concurrent.futures

            def _process_xref(xref: int):
                """Compress a single image xref. Returns (xref, bytes) or None."""
                try:
                    base_image = doc.extract_image(xref)
                    if not base_image:
                        return None
                    orig_bytes = base_image.get("image")
                    if not orig_bytes or len(orig_bytes) < 8192:
                        return None
                    pil_img = Image.open(io.BytesIO(orig_bytes))
                    w, h = pil_img.size
                    if w > max_dim or h > max_dim:
                        ratio = min(max_dim / w, max_dim / h)
                        new_size = (max(1, int(w * ratio)), max(1, int(h * ratio)))
                        pil_img = pil_img.resize(new_size, Image.Resampling.LANCZOS)
                    if pil_img.mode in ("RGBA", "LA", "P"):
                        background = Image.new("RGB", pil_img.size, (255, 255, 255))
                        if pil_img.mode == "P":
                            pil_img = pil_img.convert("RGBA")
                        background.paste(pil_img, mask=pil_img.split()[-1] if len(pil_img.split()) > 3 else None)
                        pil_img = background
                    elif pil_img.mode not in ("RGB", "L"):
                        pil_img = pil_img.convert("RGB")
                    out_bio = io.BytesIO()
                    pil_img.save(out_bio, format="JPEG", quality=jpeg_quality, optimize=True, progressive=True)
                    compressed = out_bio.getvalue()
                    if len(compressed) < len(orig_bytes):
                        return (xref, compressed)
                    return None
                except Exception as img_err:
                    logger.debug(f"PyMuPDF image xref {xref} skipped: {img_err}")
                    return None

            # Use CPU-bound thread pool; cap at 8 workers to avoid GIL contention
            max_workers = min(8, max(1, len(all_xrefs)))
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as pool:
                results = list(pool.map(_process_xref, all_xrefs))

            # Apply compressed images back to the document (must be done on main thread)
            for res in results:
                if res is not None:
                    xref, compressed_bytes = res
                    doc.update_image(xref, compressed_bytes)

            # Save with maximum lossless object stream deflation and garbage collection
            doc.save(
                str(output_path),
                garbage=4,
                deflate=True,
                deflate_images=True,
                deflate_fonts=True,
                clean=True
            )
            doc.close()
            return output_path.exists() and output_path.stat().st_size > 0
        except Exception as e:
            logger.warning(f"PyMuPDF compression error: {e}")
            return False


    def _compress_ghostscript(self, input_path: Path, output_path: Path, level: str) -> bool:
        gs_bin = self._find_ghostscript()
        if not gs_bin:
            return False

        lvl = (level or "BALANCED").upper()
        if lvl in ("LOW", "MAX"):
            pdf_setting = "/printer"
            extra_args = ["-dColorImageResolution=300", "-dGrayImageResolution=300"]
        elif lvl in ("MEDIUM", "BALANCED"):
            pdf_setting = "/ebook"
            extra_args = ["-dColorImageResolution=200", "-dGrayImageResolution=200"]
        elif lvl == "EXTREME":
            pdf_setting = "/ebook"
            extra_args = [
                "-dColorImageDownsampleType=/Bicubic",
                "-dColorImageResolution=150",
                "-dGrayImageDownsampleType=/Bicubic",
                "-dGrayImageResolution=150",
                "-dMonoImageDownsampleType=/Bicubic",
                "-dMonoImageResolution=300",
                "-dJPEGQ=75"
            ]
        else: # HIGH / HIGH-COMPRESSION
            pdf_setting = "/ebook"
            extra_args = [
                "-dColorImageDownsampleType=/Bicubic",
                "-dColorImageResolution=180",
                "-dGrayImageDownsampleType=/Bicubic",
                "-dGrayImageResolution=180",
                "-dJPEGQ=80"
            ]

        cmd = [
            gs_bin,
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            f"-dPDFSETTINGS={pdf_setting}",
            "-dNOPAUSE",
            "-dBATCH",
            "-dSAFER",
            "-dQUIET",
            "-dDetectDuplicateImages=true",
            "-dCompressFonts=true",
            "-dSubsetFonts=true",
            "-dAutoFilterColorImages=true",
            *extra_args,
            f"-sOutputFile={str(output_path)}",
            str(input_path)
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if res.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
                return True
            else:
                logger.warning(f"Ghostscript compression exited code {res.returncode}: {res.stderr}")
                return False
        except Exception as e:
            logger.warning(f"Ghostscript compression failed: {e}")
            return False

    def _compress_python_fallback(self, input_path: Path, output_path: Path) -> None:
        reader = PdfReader(str(input_path), strict=False)
        writer = PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        for page in writer.pages:
            try:
                page.compress_content_streams()
            except Exception:
                pass
            try:
                for img in page.images:
                    try:
                        img.replace(img.image, quality=78)
                    except Exception:
                        pass
            except Exception:
                pass

        with open(output_path, "wb") as f:
            writer.write(f)

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "doc.pdf"))
        opts = options or self.settings or {}

        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        input_size = input_pdf.stat().st_size
        reader = PdfReader(str(input_pdf), strict=False)
        expected_pages = len(reader.pages)

        level = opts.get("profile") or opts.get("level") or opts.get("strength") or "EXTREME"

        candidate_path = self.temp_dir / f"candidate_{self.job_id}.pdf"

        # 1. Try PyMuPDF advanced lossless/perceptual optimizer first (preserves 100% vector text)
        success = self._compress_pymupdf(input_pdf, candidate_path, str(level))
        
        # 2. Try Ghostscript if PyMuPDF was not available
        if not success or not candidate_path.exists() or candidate_path.stat().st_size == 0:
            success = self._compress_ghostscript(input_pdf, candidate_path, str(level))
            
        # 3. Fallback to pure PyPDF stream optimizer
        if not success or not candidate_path.exists() or candidate_path.stat().st_size == 0:
            self._compress_python_fallback(input_pdf, candidate_path)

        output_path = self.output_dir / f"{self.job_id}.pdf"
        compressed_size = candidate_path.stat().st_size if candidate_path.exists() else input_size

        # Invariant: NEVER return a compressed file larger than the input
        if compressed_size >= input_size or not candidate_path.exists():
            shutil.copyfile(input_pdf, output_path)
            actual_pages = validate_pdf_output(output_path)
            self.settings["no_size_reduction"] = True
            return output_path

        shutil.copyfile(candidate_path, output_path)

        # Invariant: output_pages == input_pages
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != expected_pages:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Compression altered page count: expected {expected_pages}, got {actual_pages}.")

        return output_path

    # Backward-compatible byte processing
    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        temp_in = self.temp_dir / "in.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)

        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        is_reduced = len(out_bytes) < len(content)
        if is_reduced:
            saved = len(content) - len(out_bytes)
            pct = round((saved / len(content)) * 100, 2)
            out_size = len(out_bytes)
            final_bytes = out_bytes
        else:
            saved = 0
            pct = 0.0
            out_size = len(content)
            final_bytes = content

        return final_bytes, "compressed_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": out_size,
            "saved_bytes": saved,
            "reduction_percent": pct,
            "is_reduced": is_reduced,
            "quality_status": "passed"
        }


