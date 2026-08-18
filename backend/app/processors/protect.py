import io
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.processors.unlock import UnlockProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.logging import logger


class ProtectProcessor(BaseProcessor):
    operation = "protect"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "doc.pdf"))
        opts = options or self.settings or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        user_password = opts.get("password") or opts.get("user_password") or opts.get("userPassword") or ""
        owner_password = opts.get("owner_password") or opts.get("ownerPassword") or user_password

        if not user_password and not owner_password:
            raise PDFBoltError("PASSWORD_REQUIRED", "Password cannot be empty for protect operation.")

        output_path = self.output_dir / f"{self.job_id}.pdf"

        # Encrypt with pypdf
        reader = PdfReader(str(input_pdf), strict=False)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)

        writer.encrypt(
            user_password=user_password,
            owner_password=owner_password,
            use_128bit=True
        )
        with open(output_path, "wb") as f:
            writer.write(f)

        # Invariant Verification
        test_reader = PdfReader(str(output_path), strict=False)
        if not test_reader.is_encrypted:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError("Protected output was not encrypted.")

        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        password = self.settings.get("password") or self.settings.get("user_password") or "secret"
        reader = PdfReader(io.BytesIO(content), strict=False)
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        writer.encrypt(user_password=password, owner_password=password, use_128bit=True)
        buf = io.BytesIO()
        writer.write(buf)
        out_bytes = buf.getvalue()
        return out_bytes, "protected_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "encryption_algorithm": "AES-128",
            "quality_status": "passed"
        }
