from pathlib import Path
from typing import List, Dict, Any, Union, Set
from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


class DeletePagesProcessor(BaseProcessor):
    operation = "delete-pages"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "doc.pdf"))
        opts = options or self.settings or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        reader = PdfReader(str(input_pdf), strict=False)
        total_pages = len(reader.pages)

        # Parse target pages to delete (1-based)
        del_spec: Union[List[int], str] = opts.get("pages") or opts.get("delete_pages") or []

        if isinstance(del_spec, list):
            delete_pages = [int(p) for p in del_spec]
        elif isinstance(del_spec, str):
            from backend.app.processors.split import parse_page_ranges
            delete_indices = parse_page_ranges(del_spec, total_pages)
            delete_pages = [i + 1 for i in delete_indices]
        else:
            raise PDFBoltError("INVALID_PAGE_RANGE", "No pages specified for deletion.")

        delete_set: Set[int] = set()
        for p in delete_pages:
            if p <= 0:
                raise PDFBoltError("INVALID_PAGE_RANGE", f"Invalid page number {p}.")
            if p > total_pages:
                raise PDFBoltError("PAGE_OUT_OF_RANGE", f"Page {p} exceeds document page count of {total_pages}.")
            delete_set.add(p - 1)

        if len(delete_set) >= total_pages:
            raise PDFBoltError("PAGE_LIMIT_EXCEEDED", "Cannot delete all pages from a PDF.")

        writer = PdfWriter()
        for idx, page in enumerate(reader.pages):
            if idx not in delete_set:
                writer.add_page(page)

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        # Invariant: output_pages == input_pages - len(delete_set)
        expected_remaining = total_pages - len(delete_set)
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != expected_remaining:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Delete pages invariant failed: expected {expected_remaining} pages, got {actual_pages}.")

        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        import io
        temp_in = self.temp_dir / "in.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)
        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        return out_bytes, "trimmed_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "quality_status": "passed"
        }
