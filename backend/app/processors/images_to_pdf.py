import io
from pathlib import Path
from typing import List, Dict, Any
from PIL import Image, ImageOps
from pypdf import PdfWriter, PdfReader
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


class ImagesToPdfProcessor(BaseProcessor):
    operation = "images-to-pdf"
    input_formats = [".png", ".jpg", ".jpeg", ".webp"]
    output_format = ".pdf"

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED", "No image files uploaded to convert into PDF.")

        page_size_mode = str(options.get("page_size") or options.get("pageSize") or "A4").upper()
        if page_size_mode == "LETTER":
            page_w, page_h = 612.0, 792.0
        elif page_size_mode == "A4":
            page_w, page_h = 595.28, 841.89
        else: # ORIGINAL
            page_w, page_h = None, None

        margin = float(options.get("margin") or 0.0)
        writer = PdfWriter()

        for img_path in input_files:
            with Image.open(img_path) as raw_img:
                # Handle EXIF auto-rotation
                img = ImageOps.exif_transpose(raw_img)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")

                img_w, img_h = img.size
                target_w = page_w or float(img_w)
                target_h = page_h or float(img_h)

                # Render into ReportLab PDF page
                packet = io.BytesIO()
                can = canvas.Canvas(packet, pagesize=(target_w, target_h))

                usable_w = target_w - (2 * margin)
                usable_h = target_h - (2 * margin)

                # Fit image preserving aspect ratio
                scale = min(usable_w / img_w, usable_h / img_h)
                draw_w = img_w * scale
                draw_h = img_h * scale
                draw_x = margin + (usable_w - draw_w) / 2.0
                draw_y = margin + (usable_h - draw_h) / 2.0

                # Buffer image for canvas
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, format='JPEG', quality=95)
                img_byte_arr.seek(0)

                can.drawImage(ImageReader(img_byte_arr), draw_x, draw_y, width=draw_w, height=draw_h)
                can.save()
                packet.seek(0)

                page_reader = PdfReader(packet)
                writer.add_page(page_reader.pages[0])

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        # Invariant: output_pages == len(input_images)
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != len(input_files):
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Images to PDF invariant failed: expected {len(input_files)} pages, got {actual_pages}.")

        return output_path


ImageToPDFProcessor = ImagesToPdfProcessor

