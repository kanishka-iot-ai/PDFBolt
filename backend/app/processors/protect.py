import io
from typing import Tuple, Dict, Any
import pypdf
from backend.app.processors.base import BaseProcessor
from backend.app.validators.input_validator import InputValidator
from backend.app.core.errors import PDFProcessingException, ErrorCode


class ProtectProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        page_count, is_enc = self.validate_input(content)
        if is_enc:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Document is already password-protected.",
                status_code=400
            )

        password = self.settings.get("password")
        if not password:
            raise PDFProcessingException(
                error_code=ErrorCode.PASSWORD_REQUIRED,
                message="A password is required to encrypt the document.",
                status_code=400
            )

        reader = pypdf.PdfReader(io.BytesIO(content))
        writer = pypdf.PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        # 256-bit AES encryption
        writer.encrypt(user_password=password, owner_password=password, algorithm="AES-256")

        out_buffer = io.BytesIO()
        writer.write(out_buffer)
        output_bytes = out_buffer.getvalue()

        # Validate that the output PDF exists and has matching pages
        OutputValidator = self.validate_output
        # Since it's encrypted, decrypt to validate page count
        test_reader = pypdf.PdfReader(io.BytesIO(output_bytes))
        test_reader.decrypt(password)
        if len(test_reader.pages) != page_count:
            raise PDFProcessingException(
                error_code=ErrorCode.QUALITY_CHECK_FAILED,
                message="Encrypted document validation failed page count check.",
                status_code=500
            )

        metrics = {
            "total_pages": page_count,
            "encryption": "AES-256",
            "output_size_bytes": len(output_bytes)
        }

        clean_name = filename.rsplit('.', 1)[0] + "_protected.pdf"
        return output_bytes, clean_name, metrics


class UnlockProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        InputValidator.validate_file_size(content)
        password = self.settings.get("password", "")

        reader = pypdf.PdfReader(io.BytesIO(content))
        if not reader.is_encrypted:
            # Document is not encrypted, return original
            return content, filename, {"status": "not_encrypted", "output_size_bytes": len(content)}

        if not password:
            raise PDFProcessingException(
                error_code=ErrorCode.PASSWORD_REQUIRED,
                message="Password is required to unlock this encrypted PDF.",
                status_code=401
            )

        decrypt_status = reader.decrypt(password)
        if decrypt_status == 0:
            raise PDFProcessingException(
                error_code=ErrorCode.INVALID_PASSWORD,
                message="Incorrect password provided for encrypted document.",
                status_code=401
            )

        writer = pypdf.PdfWriter()
        for page in reader.pages:
            writer.add_page(page)

        out_buffer = io.BytesIO()
        writer.write(out_buffer)
        output_bytes = out_buffer.getvalue()

        self.validate_output(output_bytes, expected_pages=len(reader.pages))

        metrics = {
            "total_pages": len(reader.pages),
            "status": "unlocked",
            "output_size_bytes": len(output_bytes)
        }

        clean_name = filename.rsplit('.', 1)[0] + "_unlocked.pdf"
        return output_bytes, clean_name, metrics
