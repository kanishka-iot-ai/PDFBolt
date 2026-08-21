import io
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


class PageNumbersProcessor(BaseProcessor):
    operation = "page-numbers"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def _generate_number_overlay(self, width: float, height: float, text: str, options: Dict[str, Any]) -> io.BytesIO:
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=(width, height))

        font_size = float(options.get("font_size") or options.get("fontSize") or 10)
        margin = float(options.get("margin") or 36) # 0.5 inch = 36 pt
        position = str(options.get("position") or "bottom-center").lower()

        can.setFont("Helvetica", font_size)
        can.setFillColor(colors.HexColor(str(options.get("color") or "#333333")))

        if position == "top-left":
            can.drawString(margin, height - margin, text)
        elif position == "top-center":
            can.drawCentredString(width / 2.0, height - margin, text)
        elif position == "top-right":
            can.drawRightString(width - margin, height - margin, text)
        elif position == "bottom-left":
            can.drawString(margin, margin, text)
        elif position == "bottom-right":
            can.drawRightString(width - margin, margin, text)
        else: # bottom-center
            can.drawCentredString(width / 2.0, margin, text)

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

        start_num = int(opts.get("start_number") or opts.get("start") or 1)
        prefix = str(opts.get("prefix") or "")
        include_total = opts.get("include_total", True)
        format_style = str(opts.get("format") or opts.get("style") or "page_x_of_y").lower()

        writer = PdfWriter()
        for idx, page in enumerate(reader.pages):
            current_num = start_num + idx
            if "of" in format_style or format_style == "page_x_of_y" or (include_total and format_style not in ("numbers_only", "1,2,3", "simple", "number_only", "number")):
                p_text = prefix if prefix else ("Page " if "page" in format_style else "")
                label = f"{p_text}{current_num} of {total_pages}"
            else:
                p_text = prefix if prefix else ("Page " if "page" in format_style else "")
                label = f"{p_text}{current_num}"

            width = float(page.mediabox.width)
            height = float(page.mediabox.height)

            num_buf = self._generate_number_overlay(width, height, label, opts)

            num_reader = PdfReader(num_buf)
            page.merge_page(num_reader.pages[0])
            writer.add_page(page)

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        # Invariant: output_pages == input_pages
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != total_pages:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Page numbers altered page count: expected {total_pages}, got {actual_pages}.")

        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        import io
        temp_in = self.temp_dir / "in.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)
        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        return out_bytes, "numbered_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "quality_status": "passed"
        }
