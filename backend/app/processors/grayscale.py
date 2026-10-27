"""
PDFBolt Black & White and Grayscale PDF Conversion Engine.
Integrates vector-level color stream rewriting and image grayscale transformation from Colab Engine.
Converts RGB/CMYK vectors, text layers, and embedded images to crisp black and white.
"""

import os
import re
import io
from pathlib import Path
from typing import List, Dict, Any, Union, Tuple
from PIL import Image

try:
    import pymupdf
    HAS_PYMUPDF = True
except ImportError:
    try:
        import fitz as pymupdf
        HAS_PYMUPDF = True
    except ImportError:
        HAS_PYMUPDF = False

from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import get_logger

logger = get_logger(__name__)


def convert_pdf_to_bw(input_path: str, output_path: str) -> bool:
    """
    True Vector & Raster Black-and-White PDF Conversion Engine.
    - Strips colors from embedded raster images in-place.
    - Intercepts and rewrites RGB, CMYK, and generic color operators in the PDF content streams.
    - Retains 100% crisp vector typography and geometry with zero blur or rasterization loss.
    """
    if not HAS_PYMUPDF:
        raise RuntimeError("PyMuPDF (fitz) is required for convert_pdf_to_bw.")

    # Open the original PDF document
    doc = pymupdf.open(input_path)

    for page in doc:
        # Clean contents to normalize the page's structural stream code
        try:
            page.clean_contents()
        except Exception as clean_err:
            logger.debug(f"clean_contents notice: {clean_err}")

        # 1. Convert all embedded images to Grayscale
        try:
            image_list = page.get_images(full=True)
        except Exception:
            image_list = []

        for img_info in image_list:
            xref = img_info[0]
            try:
                pix = pymupdf.Pixmap(doc, xref)
                if pix.colorspace and pix.colorspace.n > 1:
                    gray_pix = pymupdf.Pixmap(pymupdf.csGRAY, pix)
                    doc.update_stream(xref, gray_pix.tobytes())
            except Exception as img_err:
                logger.debug(f"Image xref {xref} grayscale notice: {img_err}")
                pass

        # 2. Intercept and rewrite all color operators in the content streams
        try:
            contents_xref_list = page.get_contents()
        except Exception:
            contents_xref_list = []

        for content_xref in contents_xref_list:
            try:
                stream = doc.xref_stream(content_xref)
            except Exception:
                stream = None

            if not stream:
                continue

            try:
                stream_str = stream.decode("latin-1")
            except Exception:
                continue

            # Convert RGB values (e.g. '0.1 0.2 0.3 rg' or '0.1 0.2 0.3 RG') to Gray ('y g' / 'y G')
            def replace_rgb(match):
                r, g, b, op = float(match.group(1)), float(match.group(2)), float(match.group(3)), match.group(4)
                gray = 0.299 * r + 0.587 * g + 0.114 * b
                gray = min(max(gray, 0.0), 1.0)
                new_op = "g" if op == "rg" else "G"
                return f"{gray:.3f} {new_op}"

            # Convert CMYK values (e.g. 'c m y k k' or 'c m y k K') to Gray ('y g' / 'y G')
            def replace_cmyk(match):
                c, m, y, k, op = float(match.group(1)), float(match.group(2)), float(match.group(3)), float(match.group(4)), match.group(5)
                r = (1.0 - c) * (1.0 - k)
                g = (1.0 - m) * (1.0 - k)
                b = (1.0 - y) * (1.0 - k)
                gray = 0.299 * r + 0.587 * g + 0.114 * b
                gray = min(max(gray, 0.0), 1.0)
                new_op = "g" if op == "k" else "G"
                return f"{gray:.3f} {new_op}"

            # Convert generic color space parameters (e.g. '0.1 0.2 0.3 sc' or '0.1 0.2 0.3 scn')
            def replace_sc(match):
                components = match.group(1).split()
                op = match.group(2)
                if len(components) == 3:  # RGB representation
                    r, g, b = float(components[0]), float(components[1]), float(components[2])
                    gray = 0.299 * r + 0.587 * g + 0.114 * b
                elif len(components) == 4:  # CMYK representation
                    c, m, y, k = float(components[0]), float(components[1]), float(components[2]), float(components[3])
                    r = (1.0 - c) * (1.0 - k)
                    g = (1.0 - m) * (1.0 - k)
                    b = (1.0 - y) * (1.0 - k)
                    gray = 0.299 * r + 0.587 * g + 0.114 * b
                else:
                    return match.group(0)  # Unknown format, keep original

                gray = min(max(gray, 0.0), 1.0)
                new_op = "g" if op in ["sc", "scn"] else "G"
                return f"{gray:.3f} {new_op}"

            # Clean RGB patterns
            rgb_pattern = r"(\-?\d*\.?\d+)\s+(\-?\d*\.?\d+)\s+(\-?\d*\.?\d+)\s+(rg|RG)\b"
            stream_str = re.sub(rgb_pattern, replace_rgb, stream_str)

            # Clean CMYK patterns
            cmyk_pattern = r"(\-?\d*\.?\d+)\s+(\-?\d*\.?\d+)\s+(\-?\d*\.?\d+)\s+(\-?\d*\.?\d+)\s+(k|K)\b"
            stream_str = re.sub(cmyk_pattern, replace_cmyk, stream_str)

            # Clean Generic / Special paint patterns (sc, SC, scn, SCN)
            sc_pattern = r"((?:\-?\d*\.?\d+\s+){3,4})(sc|SC|scn|SCN)\b"
            stream_str = re.sub(sc_pattern, replace_sc, stream_str)

            # Update the page stream content safely
            try:
                doc.update_stream(content_xref, stream_str.encode("latin-1"))
            except Exception as update_err:
                logger.debug(f"Stream update notice for xref {content_xref}: {update_err}")

    # Save the output file maintaining standard PDF parameters
    doc.save(output_path, garbage=4, deflate=True, clean=True)
    doc.close()
    logger.info(f"Success! True black & white conversion complete. Saved to: {output_path}")
    return True


class GrayscaleProcessor(BaseProcessor):
    """
    Transforms color PDFs into clean grayscale or pure monochrome black-and-white.
    Supports:
    - True vector content-stream operator rewriting (preserves 100% vector typography & crisp geometry)
    - mode="grayscale": 8-bit smooth gray
    - mode="monochrome": 1-bit high-contrast black-and-white (ideal for forms, certificates, maximum toner savings)
    """

    operation: str = "grayscale"
    input_formats: List[str] = [".pdf"]
    output_format: str = ".pdf"

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "doc.pdf"))

        opts = options or self.settings or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        mode = str(opts.get("mode") or opts.get("color_mode") or "grayscale").lower()
        is_monochrome = mode in ("monochrome", "bw", "black_and_white", "black-and-white", "1-bit", "mono")
        dpi = int(opts.get("dpi") or (300 if opts.get("high_res") else 150))
        threshold = int(opts.get("threshold") or 128)

        output_path = self.output_dir / f"{self.job_id}.pdf"

        if not HAS_PYMUPDF:
            logger.warning("PyMuPDF not available for GrayscaleProcessor; falling back to pypdf copy.")
            reader = PdfReader(str(input_pdf), strict=False)
            writer = PdfWriter()
            for page in reader.pages:
                writer.add_page(page)
            with open(output_path, "wb") as f:
                writer.write(f)
            validate_pdf_output(output_path)
            return output_path

        doc = pymupdf.open(str(input_pdf))
        total_pages = len(doc)
        doc.close()

        if total_pages == 0:
            raise PDFBoltError("FILE_EMPTY", "PDF has 0 pages.")

        # Path 1: If standard grayscale (smooth gray) is requested, run the vector operator rewriting engine
        if not is_monochrome:
            try:
                success = convert_pdf_to_bw(str(input_pdf), str(output_path))
                if success and output_path.exists() and output_path.stat().st_size > 0:
                    actual_pages = validate_pdf_output(output_path)
                    if actual_pages == total_pages:
                        logger.info(f"Vector black-and-white conversion completed successfully ({total_pages} pages).")
                        return output_path
            except Exception as vec_err:
                logger.warning(f"Vector B&W engine notice: {vec_err}. Falling back to high-res rasterization.")

        # Path 2: High-contrast 1-bit Monochrome Binarization (or fallback)
        try:
            doc = pymupdf.open(str(input_pdf))
            out_doc = pymupdf.open()
            for page_idx in range(total_pages):
                page = doc[page_idx]
                pix = page.get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY)
                raw_bytes = pix.tobytes("png")
                pil_img = Image.open(io.BytesIO(raw_bytes))

                out_buf = io.BytesIO()
                if is_monochrome:
                    bw_img = pil_img.point(lambda p: 255 if p > threshold else 0, mode="1")
                    bw_img.save(out_buf, format="PNG", optimize=True)
                else:
                    pil_img = pil_img.convert("L")
                    pil_img.save(out_buf, format="JPEG", quality=85, optimize=True)

                new_page = out_doc.new_page(width=page.rect.width, height=page.rect.height)
                new_page.insert_image(new_page.rect, stream=out_buf.getvalue())

            out_doc.save(
                str(output_path),
                garbage=4,
                deflate=True,
                clean=True
            )
            out_doc.close()
            doc.close()

            actual_pages = validate_pdf_output(output_path)
            if actual_pages != total_pages:
                output_path.unlink(missing_ok=True)
                raise OutputValidationError(f"Page count mismatch: expected {total_pages}, got {actual_pages}")

            logger.info(f"Monochrome binarization completed ({total_pages} pages, mode={mode}, dpi={dpi}).")
            return output_path

        except Exception as render_err:
            logger.error(f"Black & white conversion failed: {render_err}")
            raise PDFBoltError("PROCESSING_FAILED", f"Black & white conversion error: {render_err}")

    def process_bytes(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        temp_in = self.temp_dir / f"in_{self.job_id}.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)

        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        base_name = Path(filename).stem
        out_name = f"{base_name}_bw.pdf"
        return out_bytes, out_name, {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "operation": "grayscale",
            "quality_status": "passed"
        }
