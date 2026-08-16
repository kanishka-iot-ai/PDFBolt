import io
from typing import Tuple, Dict, Any, List
import pypdf
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFProcessingException, ErrorCode


def parse_page_ranges(range_str: str, max_pages: int) -> List[int]:
    """Parses range strings like '1-3, 5, 7-10' into 0-indexed page indices."""
    selected_indices = set()
    parts = [p.strip() for p in range_str.split(',') if p.strip()]

    for part in parts:
        if '-' in part:
            bounds = part.split('-')
            if len(bounds) == 2 and bounds[0].isdigit() and bounds[1].isdigit():
                start = max(1, int(bounds[0]))
                end = min(max_pages, int(bounds[1]))
                for i in range(start, end + 1):
                    selected_indices.add(i - 1)
        elif part.isdigit():
            val = int(part)
            if 1 <= val <= max_pages:
                selected_indices.add(val - 1)

    return sorted(list(selected_indices))


class SplitProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        page_count, is_enc = self.validate_input(content)
        if is_enc:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Cannot split encrypted PDF without password.",
                status_code=400
            )

        range_str = self.settings.get("range", "1")
        selected_pages = parse_page_ranges(range_str, page_count)

        if not selected_pages:
            raise PDFProcessingException(
                error_code=ErrorCode.INVALID_PAGE_RANGE,
                message=f'No valid pages matched the requested range "{range_str}" (document has {page_count} pages).',
                status_code=400
            )

        reader = pypdf.PdfReader(io.BytesIO(content))
        writer = pypdf.PdfWriter()

        for idx in selected_pages:
            writer.add_page(reader.pages[idx])

        out_buffer = io.BytesIO()
        writer.write(out_buffer)
        output_bytes = out_buffer.getvalue()

        # Validate output page invariant
        self.validate_output(output_bytes, expected_pages=len(selected_pages))

        metrics = {
            "original_pages": page_count,
            "extracted_pages": len(selected_pages),
            "output_size_bytes": len(output_bytes)
        }

        clean_name = filename.rsplit('.', 1)[0] + f"_split_pages_{range_str.replace(' ', '')}.pdf"
        return output_bytes, clean_name, metrics
