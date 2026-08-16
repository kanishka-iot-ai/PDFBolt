import io
from typing import Tuple, Dict, Any
import pypdf
from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFProcessingException, ErrorCode


class PageNumberProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        page_count, is_enc = self.validate_input(content)
        if is_enc:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Cannot add page numbers to encrypted PDF without password.",
                status_code=400
            )

        position = self.settings.get("position", "bottom-right")
        start_num = int(self.settings.get("start_from", 1))

        reader = pypdf.PdfReader(io.BytesIO(content))
        writer = pypdf.PdfWriter()

        for idx, page in enumerate(reader.pages):
            page_box = page.mediabox
            width = float(page_box.width)
            height = float(page_box.height)

            num_buffer = io.BytesIO()
            can = canvas.Canvas(num_buffer, pagesize=(width, height))
            can.setFillColor(Color(0.3, 0.3, 0.3))
            can.setFont("Helvetica", 10)

            page_str = f"{idx + start_num} / {page_count + start_num - 1}"

            if position == "bottom-right":
                can.drawRightString(width - 36, 24, page_str)
            elif position == "bottom-center":
                can.drawCentredString(width / 2, 24, page_str)
            elif position == "bottom-left":
                can.drawString(36, 24, page_str)
            else:
                can.drawRightString(width - 36, 24, page_str)

            can.save()
            num_buffer.seek(0)
            num_pdf = pypdf.PdfReader(num_buffer)
            page.merge_page(num_pdf.pages[0])
            writer.add_page(page)

        out_buffer = io.BytesIO()
        writer.write(out_buffer)
        output_bytes = out_buffer.getvalue()

        self.validate_output(output_bytes, expected_pages=page_count)

        metrics = {
            "total_pages": page_count,
            "position": position,
            "output_size_bytes": len(output_bytes)
        }

        clean_name = filename.rsplit('.', 1)[0] + "_numbered.pdf"
        return output_bytes, clean_name, metrics
