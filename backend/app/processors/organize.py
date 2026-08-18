from pathlib import Path
from typing import List, Dict, Any, Union
from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


class OrganizeProcessor(BaseProcessor):
    operation = "organize"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        reader = PdfReader(str(input_pdf), strict=False)
        total_pages = len(reader.pages)

        order_spec: Union[List[int], str] = options.get("order") or options.get("pages") or options.get("new_order") or []
        if isinstance(order_spec, str):
            order_spec = [int(x.strip()) for x in order_spec.split(',') if x.strip().isdigit()]

        if not order_spec:
            raise PDFBoltError("INVALID_PAGE_RANGE", "No page order array provided.")

        new_order = [int(p) for p in order_spec]

        # Validation
        for p in new_order:
            if p <= 0:
                raise PDFBoltError("INVALID_PAGE_RANGE", f"Invalid page number {p}.")
            if p > total_pages:
                raise PDFBoltError("PAGE_OUT_OF_RANGE", f"Page {p} exceeds document page count of {total_pages}.")

        writer = PdfWriter()
        for p in new_order:
            idx = p - 1
            writer.add_page(reader.pages[idx])

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        # Invariant: output_pages == len(new_order)
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != len(new_order):
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Organize invariant failed: expected {len(new_order)} pages, got {actual_pages}.")

        return output_path
