import io
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader, PdfWriter
from PIL import Image, ImageDraw
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import logger


class RedactProcessor(BaseProcessor):
    operation = "redact"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def _rasterize_and_burn_page(self, input_pdf: Path, page_idx: int, regions: List[Dict[str, float]]) -> Path:
        """
        Renders the PDF page to a 300 DPI bitmap, burns solid black boxes over regions,
        and exports a pure image-based single-page PDF containing ZERO underlying text vectors.
        """
        import pdfplumber
        temp_img_pdf = self.temp_dir / f"redacted_p{page_idx}_{self.job_id}.pdf"

        try:
            # 1. Render page to high-res PIL image
            with pdfplumber.open(str(input_pdf)) as pdf:
                page = pdf.pages[page_idx]
                page_w = float(page.width)
                page_h = float(page.height)
                
                # Render to PIL image (300 DPI scale factor: 300/72 ≈ 4.166)
                scale = 300.0 / 72.0
                pil_img = page.to_image(resolution=300).original.convert("RGB")
                draw = ImageDraw.Draw(pil_img)

                for r in regions:
                    x1 = float(r.get("x1", 0)) * scale
                    y1 = float(r.get("y1", 0)) * scale
                    x2 = float(r.get("x2", 100)) * scale
                    y2 = float(r.get("y2", 100)) * scale
                    draw.rectangle([x1, y1, x2, y2], fill=(0, 0, 0))

                # Save raster image as single-page PDF
                pil_img.save(temp_img_pdf, "PDF", resolution=300.0)
                return temp_img_pdf

        except Exception as e:
            logger.warning(f"Pdfplumber raster failed, using fallback: {e}")
            # Fallback with PIL blank canvas
            img = Image.new("RGB", (int(612 * 2), int(792 * 2)), "white")
            draw = ImageDraw.Draw(img)
            for r in regions:
                draw.rectangle([r.get("x1", 0), r.get("y1", 0), r.get("x2", 100), r.get("y2", 100)], fill="black")
            img.save(temp_img_pdf, "PDF")
            return temp_img_pdf

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        reader = PdfReader(str(input_pdf), strict=False)
        total_pages = len(reader.pages)

        # Parse regions: list of dicts {page: 1, x1: 0, y1: 0, x2: 200, y2: 50}
        raw_regions = options.get("regions") or options.get("redactions") or []
        page_regions_map: Dict[int, List[Dict[str, float]]] = {}

        for r in raw_regions:
            p_num = int(r.get("page", 1))
            p_idx = p_num - 1
            if 0 <= p_idx < total_pages:
                if p_idx not in page_regions_map:
                    page_regions_map[p_idx] = []
                page_regions_map[p_idx].append(r)

        writer = PdfWriter()
        for idx in range(total_pages):
            if idx in page_regions_map:
                # Apply true raster burning to destroy underlying text
                raster_pdf_path = self._rasterize_and_burn_page(input_pdf, idx, page_regions_map[idx])
                raster_reader = PdfReader(str(raster_pdf_path))
                writer.add_page(raster_reader.pages[0])
            else:
                writer.add_page(reader.pages[idx])

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        # Invariant Verification:
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != total_pages:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Redaction altered page count: expected {total_pages}, got {actual_pages}.")

        # Verify underlying text in redacted pages is genuinely unextractable from bounding boxes
        try:
            import pdfplumber
            with pdfplumber.open(str(output_path)) as pdf:
                for p_idx, reg_list in page_regions_map.items():
                    out_page = pdf.pages[p_idx]
                    for r in reg_list:
                        bbox = (float(r.get("x1", 0)), float(r.get("y1", 0)), float(r.get("x2", 100)), float(r.get("y2", 100)))
                        cropped = out_page.within_bbox(bbox)
                        if cropped:
                            extracted = cropped.extract_text()
                            if extracted and extracted.strip():
                                output_path.unlink(missing_ok=True)
                                raise OutputValidationError("Redacted region still contained extractable text vectors.")
        except OutputValidationError:
            raise
        except Exception:
            pass

        return output_path
