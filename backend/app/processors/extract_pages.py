from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.processors.split import parse_page_ranges


class ExtractPagesProcessor(BaseProcessor):
    operation = "extract-pages"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        reader = PdfReader(str(input_pdf), strict=False)
        total_pages = len(reader.pages)

        range_str = options.get("ranges") or options.get("pages") or options.get("range") or f"1-{total_pages}"
        if isinstance(range_str, list):
            range_str = ",".join(str(x) for x in range_str)

        target_indices = parse_page_ranges(str(range_str), total_pages)

        writer = PdfWriter()
        for idx in target_indices:
            writer.add_page(reader.pages[idx])

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        actual_pages = validate_pdf_output(output_path)
        if actual_pages != len(target_indices):
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Extract pages invariant failed: expected {len(target_indices)} pages, got {actual_pages}.")

        return output_path
