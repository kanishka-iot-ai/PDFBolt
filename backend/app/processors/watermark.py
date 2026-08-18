import io
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


class WatermarkProcessor(BaseProcessor):
    operation = "watermark"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def _hex_to_color(self, hex_str: str, opacity: float):
        clean = hex_str.lstrip('#')
        if len(clean) == 6:
            r = int(clean[0:2], 16) / 255.0
            g = int(clean[2:4], 16) / 255.0
            b = int(clean[4:6], 16) / 255.0
            return colors.Color(r, g, b, alpha=opacity)
        return colors.Color(0.5, 0.5, 0.5, alpha=opacity)

    def _generate_watermark_page(self, width: float, height: float, text: str, options: Dict[str, Any]) -> io.BytesIO:
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=(width, height))

        font_size = float(options.get("font_size") or options.get("fontSize") or 48)
        opacity = float(options.get("opacity") or 0.3)
        color_hex = str(options.get("color") or "#718096")
        rotation = float(options.get("rotation") or 45)
        position = str(options.get("position") or "center").lower()

        watermark_color = self._hex_to_color(color_hex, opacity)
        can.setFont("Helvetica-Bold", font_size)
        can.setFillColor(watermark_color)

        can.saveState()
        if position == "diagonal" or rotation != 0:
            can.translate(width / 2.0, height / 2.0)
            can.rotate(rotation)
            can.drawCentredString(0, 0, text)
        elif position == "top-left":
            can.drawString(50, height - 50, text)
        elif position == "top-right":
            can.drawRightString(width - 50, height - 50, text)
        elif position == "bottom-left":
            can.drawString(50, 50, text)
        elif position == "bottom-right":
            can.drawRightString(width - 50, 50, text)
        else: # center
            can.drawCentredString(width / 2.0, height / 2.0, text)

        can.restoreState()
        can.save()
        packet.seek(0)
        return packet

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "doc.pdf"))
        opts = options or self.settings or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        reader = PdfReader(str(input_pdf), strict=False)
        total_pages = len(reader.pages)

        watermark_text = opts.get("text") or opts.get("watermark") or "CONFIDENTIAL"

        writer = PdfWriter()
        for page in reader.pages:
            width = float(page.mediabox.width)
            height = float(page.mediabox.height)

            wm_buf = self._generate_watermark_page(width, height, watermark_text, opts)
            wm_reader = PdfReader(wm_buf)
            page.merge_page(wm_reader.pages[0])
            writer.add_page(page)


        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        # Invariant: output_pages == input_pages
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != total_pages:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Watermark altered page count: expected {total_pages}, got {actual_pages}.")

        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        import io
        temp_in = self.temp_dir / "in.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)
        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        return out_bytes, "watermarked_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "quality_status": "passed"
        }
