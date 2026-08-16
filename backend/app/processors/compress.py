import io
from typing import Dict, Any, Tuple, Optional
import pypdf
from PIL import Image
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFProcessingException, ErrorCode


class CompressProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        orig_size = len(content)
        page_count, is_encrypted = self.validate_input(content)

        if is_encrypted:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Cannot compress password-protected PDF without password.",
                status_code=400
            )

        profile = self.settings.get("profile", "balanced").lower()
        target_size_mb = self.settings.get("target_size_mb")

        # Determine DPI and JPEG Quality
        if profile == "max" or profile == "maximum_quality":
            dpi = 300
            quality = 92
        elif profile == "high" or profile == "high_quality":
            dpi = 200
            quality = 85
        elif profile == "balanced":
            dpi = 150
            quality = 75
        elif profile == "high_compression":
            dpi = 100
            quality = 58
        elif profile == "extreme" or profile == "extreme_compression":
            dpi = 72
            quality = 42
        elif profile == "custom":
            dpi = int(self.settings.get("custom_dpi", 150))
            quality = int(self.settings.get("custom_quality", 75))
        else:
            dpi = 150
            quality = 75

        # If Target Size MB specified, compute dynamic ratio
        if target_size_mb:
            current_mb = orig_size / (1024 * 1024)
            ratio = float(target_size_mb) / max(0.1, current_mb)
            if ratio < 0.3:
                dpi, quality = 72, 42
            elif ratio < 0.6:
                dpi, quality = 100, 58
            elif ratio < 0.85:
                dpi, quality = 150, 75
            else:
                dpi, quality = 200, 85

        reader = pypdf.PdfReader(io.BytesIO(content))
        writer = pypdf.PdfWriter()

        for page in reader.pages:
            added_page = writer.add_page(page)

            # Compress embedded raster images if present
            try:
                for img in added_page.images:
                    # Only re-compress if raster image size warrants it
                    if len(img.data) > 50 * 1024:
                        pil_img = Image.open(io.BytesIO(img.data))
                        if pil_img.mode in ("RGBA", "P"):
                            pil_img = pil_img.convert("RGB")
                        
                        out_buf = io.BytesIO()
                        pil_img.save(out_buf, format="JPEG", quality=quality, optimize=True)
                        new_img_data = out_buf.getvalue()

                        if len(new_img_data) < len(img.data):
                            img.replace(pil_img, quality=quality)
            except Exception:
                pass  # Fallback to stream compression if individual image replace is unsupported

            try:
                added_page.compress_content_streams()
            except Exception:
                pass

        # Strip metadata if requested
        if self.settings.get("strip_metadata", True):
            writer.add_metadata({})

        out_buffer = io.BytesIO()
        writer.write(out_buffer)
        output_bytes = out_buffer.getvalue()

        # Validate that output is a valid PDF
        self.validate_output(output_bytes, expected_pages=page_count)
        output_size = len(output_bytes)

        # REGRESSION TRAP & ACCEPTANCE CRITERIA
        # If output is larger than or equal to original, reject output, preserve original, and report no reduction
        if output_size >= orig_size:
            metrics = {
                "original_size_bytes": orig_size,
                "output_size_bytes": orig_size,
                "saved_bytes": 0,
                "reduction_percent": 0.0,
                "is_reduced": False,
                "quality_status": "preserved_original",
                "notice": "No size reduction achieved. Your original file has been preserved."
            }
            clean_out_name = filename.rsplit('.', 1)[0] + "_compressed.pdf"
            return content, clean_out_name, metrics

        saved_bytes = orig_size - output_size
        reduction_percent = round((saved_bytes / orig_size) * 100, 2)

        metrics = {
            "original_size_bytes": orig_size,
            "output_size_bytes": output_size,
            "saved_bytes": saved_bytes,
            "reduction_percent": reduction_percent,
            "is_reduced": True,
            "quality_status": "excellent"
        }

        clean_out_name = filename.rsplit('.', 1)[0] + "_compressed.pdf"
        return output_bytes, clean_out_name, metrics
