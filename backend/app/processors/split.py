import re
import zipfile
from pathlib import Path
from typing import List, Dict, Any, Set
from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


def parse_page_ranges(range_str: str, total_pages: int) -> List[int]:
    """
    Parses strings like '1', '1-5', '1,3,5', '1-3,7,9-11' (1-based) into ordered list of 0-based page indices.
    """
    if not range_str or not range_str.strip():
        raise PDFBoltError("INVALID_PAGE_RANGE", "Empty page range provided.")

    pages_0based: List[int] = []
    seen: Set[int] = set()
    parts = [p.strip() for p in range_str.split(',') if p.strip()]

    if not parts:
        raise PDFBoltError("INVALID_PAGE_RANGE", "Invalid page range format.")

    for part in parts:
        if '-' in part:
            bounds = part.split('-')
            if len(bounds) != 2 or not bounds[0].strip().isdigit() or not bounds[1].strip().isdigit():
                raise PDFBoltError("INVALID_PAGE_RANGE", f"Malformed range syntax: '{part}'")
            start = int(bounds[0].strip())
            end = int(bounds[1].strip())
            if start <= 0 or end <= 0:
                raise PDFBoltError("INVALID_PAGE_RANGE", "Page numbers must be greater than 0.")
            if start > end:
                raise PDFBoltError("INVALID_PAGE_RANGE", f"Range start ({start}) cannot exceed end ({end}).")
            if end > total_pages:
                raise PDFBoltError("PAGE_OUT_OF_RANGE", f"Page {end} exceeds document page count of {total_pages}.")
            for p in range(start, end + 1):
                idx = p - 1
                if idx not in seen:
                    pages_0based.append(idx)
                    seen.add(idx)
        else:
            if not part.isdigit():
                raise PDFBoltError("INVALID_PAGE_RANGE", f"Invalid page number: '{part}'")
            p = int(part)
            if p <= 0:
                raise PDFBoltError("INVALID_PAGE_RANGE", "Page number must be greater than 0.")
            if p > total_pages:
                raise PDFBoltError("PAGE_OUT_OF_RANGE", f"Page {p} exceeds document page count of {total_pages}.")
            idx = p - 1
            if idx not in seen:
                pages_0based.append(idx)
                seen.add(idx)

    if not pages_0based:
        raise PDFBoltError("INVALID_PAGE_RANGE", "No valid pages specified.")

    return pages_0based


class SplitProcessor(BaseProcessor):
    operation = "split"
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

        range_str = opts.get("ranges") or opts.get("pages") or opts.get("range") or f"1-{total_pages}"

        if isinstance(range_str, list):
            range_str = ",".join(str(x) for x in range_str)

        target_indices = parse_page_ranges(str(range_str), total_pages)

        # Build output PDF
        writer = PdfWriter()
        for idx in target_indices:
            writer.add_page(reader.pages[idx])

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        # Verify Invariant
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != len(target_indices):
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Split invariant failed: expected {len(target_indices)} pages, got {actual_pages}.")

        return output_path

    # Backward-compatible byte processing
    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        import io
        reader = PdfReader(io.BytesIO(content), strict=False)
        total_pages = len(reader.pages)
        range_str = self.settings.get("ranges") or self.settings.get("pages") or self.settings.get("range") or f"1-{total_pages}"

        if isinstance(range_str, list):
            range_str = ",".join(str(x) for x in range_str)
        target_indices = parse_page_ranges(str(range_str), total_pages)

        writer = PdfWriter()
        for idx in target_indices:
            writer.add_page(reader.pages[idx])

        out_buf = io.BytesIO()
        writer.write(out_buf)
        out_bytes = out_buf.getvalue()

        return out_bytes, "split_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "original_pages": total_pages,
            "extracted_pages": len(target_indices),
            "quality_status": "passed"
        }
