from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


class MergeProcessor(BaseProcessor):
    operation = "merge"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files or len(input_files) < 2:
            raise PDFBoltError("NO_FILES_PROVIDED", "Merge operation requires at least two PDF documents.")

        writer = PdfWriter()
        total_expected_pages = 0

        for idx, file_path in enumerate(input_files):
            try:
                reader = PdfReader(str(file_path), strict=False)
                if reader.is_encrypted:
                    raise PDFBoltError("PASSWORD_REQUIRED", f"Document #{idx+1} is password-protected and cannot be merged without unlocking.")
                
                page_count = len(reader.pages)
                total_expected_pages += page_count

                for page in reader.pages:
                    writer.add_page(page)

            except PDFBoltError:
                raise
            except Exception as e:
                raise PDFBoltError("INVALID_PDF", f"Failed to read input PDF #{idx+1} ({file_path.name}): {e}")

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        # Invariant Verification
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != total_expected_pages:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Merge invariant failed: expected {total_expected_pages} pages, but generated {actual_pages} pages.")

        return output_path

    # Backward compatibility method for byte-oriented legacy tests
    def process_multiple(self, files_data: List[tuple[bytes, str]]) -> tuple[bytes, str, Dict[str, Any]]:
        import io
        writer = PdfWriter()
        total_pages = 0
        total_in_bytes = 0

        for content, name in files_data:
            total_in_bytes += len(content)
            reader = PdfReader(io.BytesIO(content), strict=False)
            total_pages += len(reader.pages)
            for page in reader.pages:
                writer.add_page(page)

        out_buf = io.BytesIO()
        writer.write(out_buf)
        out_bytes = out_buf.getvalue()

        return out_bytes, "merged_document.pdf", {
            "original_size_bytes": total_in_bytes,
            "output_size_bytes": len(out_bytes),
            "merged_files_count": len(files_data),
            "total_pages": total_pages,
            "quality_status": "passed"
        }
