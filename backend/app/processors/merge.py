import io
from typing import List, Tuple, Dict, Any
import pypdf
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFProcessingException, ErrorCode


class MergeProcessor(BaseProcessor):
    def process_multiple(self, files_data: List[Tuple[bytes, str]]) -> Tuple[bytes, str, Dict[str, Any]]:
        if not files_data or len(files_data) < 2:
            raise PDFProcessingException(
                error_code=ErrorCode.INVALID_PDF,
                message="Merge requires at least two PDF documents.",
                status_code=400
            )

        merger = pypdf.PdfMerger()
        total_input_bytes = 0
        expected_pages = 0

        for content, name in files_data:
            pages, is_enc = self.validate_input(content)
            if is_enc:
                raise PDFProcessingException(
                    error_code=ErrorCode.ENCRYPTED_PDF,
                    message=f'Cannot merge encrypted file "{name}".',
                    status_code=400
                )
            expected_pages += pages
            total_input_bytes += len(content)
            merger.append(io.BytesIO(content))

        out_buffer = io.BytesIO()
        merger.write(out_buffer)
        merger.close()

        output_bytes = out_buffer.getvalue()
        
        # Validate output page invariant
        self.validate_output(output_bytes, expected_pages=expected_pages)

        metrics = {
            "input_file_count": len(files_data),
            "total_input_bytes": total_input_bytes,
            "output_size_bytes": len(output_bytes),
            "total_pages": expected_pages
        }

        return output_bytes, "merged_document.pdf", metrics

    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        return self.process_multiple([(content, filename)])
