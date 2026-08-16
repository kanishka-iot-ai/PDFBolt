import io
from typing import Tuple, Dict, Any
import pypdf
from backend.app.processors.base import BaseProcessor
from backend.app.processors.split import parse_page_ranges
from backend.app.core.errors import PDFProcessingException, ErrorCode


class DeletePagesProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        page_count, is_enc = self.validate_input(content)
        if is_enc:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Cannot delete pages from encrypted PDF without password.",
                status_code=400
            )

        pages_to_delete_str = self.settings.get("pages", "")
        delete_indices = set(parse_page_ranges(pages_to_delete_str, page_count))

        if not delete_indices:
            raise PDFProcessingException(
                error_code=ErrorCode.INVALID_PAGE_RANGE,
                message="No valid page numbers provided for deletion.",
                status_code=400
            )

        if len(delete_indices) >= page_count:
            raise PDFProcessingException(
                error_code=ErrorCode.INVALID_PAGE_RANGE,
                message="Cannot delete all pages from the document.",
                status_code=400
            )

        reader = pypdf.PdfReader(io.BytesIO(content))
        writer = pypdf.PdfWriter()

        expected_remaining = page_count - len(delete_indices)

        for i in range(page_count):
            if i not in delete_indices:
                writer.add_page(reader.pages[i])

        out_buffer = io.BytesIO()
        writer.write(out_buffer)
        output_bytes = out_buffer.getvalue()

        self.validate_output(output_bytes, expected_pages=expected_remaining)

        metrics = {
            "original_pages": page_count,
            "deleted_pages_count": len(delete_indices),
            "remaining_pages": expected_remaining,
            "output_size_bytes": len(output_bytes)
        }

        clean_name = filename.rsplit('.', 1)[0] + "_pages_removed.pdf"
        return output_bytes, clean_name, metrics
