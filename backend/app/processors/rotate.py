from pathlib import Path
from typing import List, Dict, Any, Union
from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


class RotateProcessor(BaseProcessor):
    operation = "rotate"
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

        # Parse angle (90, 180, 270)
        angle = int(opts.get("angle") or opts.get("rotation") or 90)
        if angle not in [90, 180, 270, -90, -180, -270]:
            raise PDFBoltError("PROCESSING_FAILED", f"Invalid rotation angle {angle}. Must be 90, 180, or 270 degrees.")

        # Determine target pages
        target_pages: Union[str, List[int]] = opts.get("pages") or opts.get("page") or "all"

        if target_pages == "all" or target_pages is None:
            rotate_indices = set(range(total_pages))
        elif isinstance(target_pages, list):
            rotate_indices = {int(p) - 1 for p in target_pages if 1 <= int(p) <= total_pages}
        else:
            from backend.app.processors.split import parse_page_ranges
            rotate_indices = set(parse_page_ranges(str(target_pages), total_pages))

        writer = PdfWriter()
        for idx, page in enumerate(reader.pages):
            if idx in rotate_indices:
                page.rotate(angle)
            writer.add_page(page)

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        # Invariant: output_pages == input_pages
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != total_pages:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Rotation invariant failed: expected {total_pages} pages, got {actual_pages}.")

        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        import io
        temp_in = self.temp_dir / "in.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)
        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        return out_bytes, "rotated_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "quality_status": "passed"
        }
