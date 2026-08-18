import io
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import logger


class OcrProcessor(BaseProcessor):
    operation = "ocr"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def _ocr_image_to_text(self, pil_image, lang: str = "eng") -> str:
        try:
            import pytesseract
            # Try to run pytesseract
            text = pytesseract.image_to_string(pil_image, lang=lang, config="--oem 3 --psm 6")
            return text
        except Exception as e:
            logger.info(f"pytesseract extraction bypassed/unavailable: {e}")
            return ""

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        reader = PdfReader(str(input_pdf), strict=False)
        total_pages = len(reader.pages)
        lang = str(options.get("language") or options.get("lang") or "eng")

        writer = PdfWriter()

        for idx, page in enumerate(reader.pages):
            existing_text = page.extract_text() or ""
            
            # If page is already text-bearing or OCR is requested
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)

            # Generate transparent OCR text layer overlay if new text is recognized
            if not existing_text.strip():
                # Attempt OCR on page image
                try:
                    import pdfplumber
                    with pdfplumber.open(str(input_pdf)) as pdf_doc:
                        plumb_page = pdf_doc.pages[idx]
                        pil_img = plumb_page.to_image(resolution=150).original
                        ocr_text = self._ocr_image_to_text(pil_img, lang)
                        
                        if ocr_text.strip():
                            packet = io.BytesIO()
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
                except Exception as e:
                    logger.warning(f"OCR page {idx+1} processing note: {e}")

            writer.add_page(page)

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        actual_pages = validate_pdf_output(output_path)
        if actual_pages != total_pages:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"OCR altered page count: expected {total_pages}, got {actual_pages}.")

        return output_path
