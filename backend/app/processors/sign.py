import io
import base64
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


class SignProcessor(BaseProcessor):
    operation = "sign"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def _generate_signature_overlay(self, width: float, height: float, options: Dict[str, Any]) -> io.BytesIO:
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=(width, height))

        sig_data = options.get("signature_data") or options.get("signature") or ""
        sig_name = options.get("signature_name") or options.get("name") or "Authorized Signature"
        preset = str(options.get("position_preset") or options.get("preset") or "bottom-right").lower()

        # Dimensions
        sig_w = float(options.get("width") or 150)
        sig_h = float(options.get("height") or 50)
        margin = float(options.get("margin") or 40)

        if preset == "bottom-left":
            x = margin
            y = margin
        elif preset == "bottom-center":
            x = (width - sig_w) / 2.0
            y = margin
        elif preset == "custom":
            x = float(options.get("x", width - sig_w - margin))
            y = float(options.get("y", margin))
        else: # bottom-right
            x = width - sig_w - margin
            y = margin

        if sig_data and (sig_data.startswith("data:image") or len(sig_data) > 100):
            try:
                # Base64 image signature
                if "," in sig_data:
                    sig_data = sig_data.split(",", 1)[1]
                img_bytes = base64.b64decode(sig_data)
                img_reader = ImageReader(io.BytesIO(img_bytes))
                can.drawImage(img_reader, x, y, width=sig_w, height=sig_h, mask='auto', preserveAspectRatio=True)
            except Exception:
                can.setFont("Helvetica-Bold", 14)
                can.drawString(x, y + 20, sig_name)
        else:
            # Typed text signature
            can.setFont("Helvetica-BoldOblique", 16)
            can.drawString(x, y + 20, sig_name)
            can.setLineWidth(1)
            can.line(x, y + 15, x + sig_w, y + 15)

        can.save()
        packet.seek(0)
        return packet

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        reader = PdfReader(str(input_pdf), strict=False)
        total_pages = len(reader.pages)

        target_page_num = int(options.get("page") or total_pages)
        if target_page_num < 1 or target_page_num > total_pages:
            target_page_num = total_pages

        target_idx = target_page_num - 1

        writer = PdfWriter()
        for idx, page in enumerate(reader.pages):
            if idx == target_idx:
                width = float(page.mediabox.width)
                height = float(page.mediabox.height)
                sig_buf = self._generate_signature_overlay(width, height, options)
                sig_reader = PdfReader(sig_buf)
                page.merge_page(sig_reader.pages[0])
            writer.add_page(page)

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        actual_pages = validate_pdf_output(output_path)
        if actual_pages != total_pages:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Signature operation altered page count: expected {total_pages}, got {actual_pages}.")

        return output_path
