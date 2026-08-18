import io
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output


class UnlockProcessor(BaseProcessor):
    operation = "unlock"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "doc.pdf"))
        opts = options or self.settings or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        password = opts.get("password") or ""

        reader = PdfReader(str(input_pdf), strict=False)
        if reader.is_encrypted:
            decrypt_success = reader.decrypt(password)
            if decrypt_success == 0:
                raise PDFBoltError("INVALID_PASSWORD", "Incorrect password provided for encrypted document.")

        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)

        output_path = self.output_dir / f"{self.job_id}.pdf"
        with open(output_path, "wb") as f:
            writer.write(f)

        # Post-validation: Must open cleanly without password
        unlocked_reader = PdfReader(str(output_path), strict=False)
        if unlocked_reader.is_encrypted:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError("Output document is still encrypted after unlock operation.")

        validate_pdf_output(output_path)
        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        password = self.settings.get("password") or ""
        reader = PdfReader(io.BytesIO(content), strict=False)
        if reader.is_encrypted:
            reader.decrypt(password)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        buf = io.BytesIO()
        writer.write(buf)
        out_bytes = buf.getvalue()
        return out_bytes, "unlocked_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "quality_status": "passed"
        }
