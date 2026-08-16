import io
from typing import Tuple, Dict, Any
import pypdf
from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFProcessingException, ErrorCode


class WatermarkProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        page_count, is_enc = self.validate_input(content)
        if is_enc:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Cannot watermark password-protected PDF without password.",
                status_code=400
            )

        text = self.settings.get("text", "CONFIDENTIAL")
        font_size = int(self.settings.get("font_size", 48))
        opacity = float(self.settings.get("opacity", 0.3))

        reader = pypdf.PdfReader(io.BytesIO(content))
        writer = pypdf.PdfWriter()

        for page in reader.pages:
            # Create watermark canvas matching page dimensions
            page_box = page.mediabox
            width = float(page_box.width)
            height = float(page_box.height)

            watermark_buffer = io.BytesIO()
            can = canvas.Canvas(watermark_buffer, pagesize=(width, height))
            can.setFillColor(Color(0.5, 0.5, 0.5, alpha=opacity))
            can.setFont("Helvetica-Bold", font_size)

            can.saveState()
            can.translate(width / 2, height / 2)
            can.rotate(45)
            can.drawCentredString(0, 0, text)
            can.restoreState()
            can.save()

            watermark_buffer.seek(0)
            wm_pdf = pypdf.PdfReader(watermark_buffer)
            page.merge_page(wm_pdf.pages[0])
            writer.add_page(page)

        out_buffer = io.BytesIO()
        writer.write(out_buffer)
        output_bytes = out_buffer.getvalue()

        self.validate_output(output_bytes, expected_pages=page_count)

        metrics = {
            "watermark_text": text,
            "total_pages": page_count,
            "output_size_bytes": len(output_bytes)
        }

        clean_name = filename.rsplit('.', 1)[0] + "_watermarked.pdf"
        return output_bytes, clean_name, metrics
