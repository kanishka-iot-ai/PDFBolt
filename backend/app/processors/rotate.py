import io
from typing import Tuple, Dict, Any
import pypdf
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFProcessingException, ErrorCode


class RotateProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        page_count, is_enc = self.validate_input(content)
        if is_enc:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Cannot rotate password-protected PDF without password.",
                status_code=400
            )

        angle = int(self.settings.get("angle", 90))
        if angle not in (90, 180, 270):
            angle = 90

        reader = pypdf.PdfReader(io.BytesIO(content))
        writer = pypdf.PdfWriter()

        for page in reader.pages:
            page.rotate(angle)
            writer.add_page(page)

        out_buffer = io.BytesIO()
        writer.write(out_buffer)
        output_bytes = out_buffer.getvalue()

        self.validate_output(output_bytes, expected_pages=page_count)

        metrics = {
            "rotation_angle": angle,
            "total_pages": page_count,
            "output_size_bytes": len(output_bytes)
        }

        clean_name = filename.rsplit('.', 1)[0] + f"_rotated_{angle}deg.pdf"
        return output_bytes, clean_name, metrics
