import io
import zipfile
from typing import Tuple, Dict, Any, List
import pypdf
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFProcessingException, ErrorCode
from backend.app.validators.output_validator import OutputValidator


class PDFToImageProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        page_count, is_enc = self.validate_input(content)
        if is_enc:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Cannot extract images from encrypted PDF without password.",
                status_code=400
            )

        format_type = self.settings.get("format", "jpeg").lower()
        if format_type not in ("jpeg", "jpg", "png"):
            format_type = "jpeg"

        # Try to render pages using PyMuPDF if installed, or extract embedded raster images
        zip_buffer = io.BytesIO()
        extracted_count = 0

        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(stream=content, filetype="pdf")
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes(format_type)
                    ext = "jpg" if format_type in ("jpeg", "jpg") else "png"
                    zf.writestr(f"page_{page_num + 1}.{ext}", img_bytes)
                    extracted_count += 1
                doc.close()
            except ImportError:
                # Fallback: Extract embedded images via pypdf
                reader = pypdf.PdfReader(io.BytesIO(content))
                for page_idx, page in enumerate(reader.pages):
                    for img_idx, img in enumerate(page.images):
                        zf.writestr(f"page_{page_idx + 1}_img_{img_idx + 1}.jpg", img.data)
                        extracted_count += 1

        output_zip = zip_buffer.getvalue()
        OutputValidator.validate_openxml_output(output_zip, format_name="ZIP")

        metrics = {
            "images_generated": extracted_count,
            "format": format_type,
            "output_size_bytes": len(output_zip)
        }

        clean_name = filename.rsplit('.', 1)[0] + "_images.zip"
        return output_zip, clean_name, metrics


class ImageToPDFProcessor(BaseProcessor):
    def process_images(self, images_data: List[Tuple[bytes, str]]) -> Tuple[bytes, str, Dict[str, Any]]:
        if not images_data:
            raise PDFProcessingException(
                error_code=ErrorCode.FILE_EMPTY,
                message="No image files provided for PDF conversion.",
                status_code=400
            )

        pdf_buffer = io.BytesIO()
        can = canvas.Canvas(pdf_buffer)

        for img_bytes, img_name in images_data:
            try:
                pil_img = Image.open(io.BytesIO(img_bytes))
                img_w, img_h = pil_img.size

                can.setPageSize((img_w, img_h))
                
                # Draw image onto canvas
                can.drawInlineImage(pil_img, 0, 0, width=img_w, height=img_h)
                can.showPage()
            except Exception as e:
                raise PDFProcessingException(
                    error_code=ErrorCode.UNSUPPORTED_FORMAT,
                    message=f'Failed to process image "{img_name}": {str(e)}',
                    status_code=400
                )

        can.save()
        output_bytes = pdf_buffer.getvalue()

        self.validate_output(output_bytes, expected_pages=len(images_data))

        metrics = {
            "images_converted": len(images_data),
            "total_pages": len(images_data),
            "output_size_bytes": len(output_bytes)
        }

        return output_bytes, "images_converted.pdf", metrics

    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        return self.process_images([(content, filename)])
