import io
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    import pikepdf
    HAS_PIKEPDF = True
except ImportError:
    HAS_PIKEPDF = False

try:
    import pymupdf
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import logger


class UnlockProcessor(BaseProcessor):
    """
    Enterprise-grade authorized document decryption and permission removal engine.
    Supports RC4 (40-bit/128-bit), AES-128, and AES-256 standard and extension encryptions.
    """
    operation = "unlock"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "doc.pdf"))
        opts = options or self.settings or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = Path(input_files[0])
        password = str(opts.get("password") or "")
        output_path = self.output_dir / f"{self.job_id}.pdf"

        decrypted = False

        # Engine 1: pikepdf (QPDF C++ High-Performance Decryption)
        if HAS_PIKEPDF:
            try:
                with pikepdf.open(str(input_pdf), password=password, suppress_warnings=True) as pdf:
                    pdf.save(str(output_path), linearize=False)
                    if output_path.exists() and output_path.stat().st_size > 100:
                        decrypted = True
            except pikepdf.PasswordError:
                raise PDFBoltError("INVALID_PASSWORD", "Incorrect password provided for encrypted document.")
            except Exception as e:
                logger.debug(f"Pikepdf unlock attempt notice: {e}")

        # Engine 2: PyMuPDF Decryption
        if not decrypted and HAS_PYMUPDF:
            try:
                doc = pymupdf.open(str(input_pdf))
                if doc.is_encrypted:
                    auth_result = doc.authenticate(password)
                    if auth_result == 0:
                        doc.close()
                        raise PDFBoltError("INVALID_PASSWORD", "Incorrect password provided for encrypted document.")
                doc.save(str(output_path), garbage=4, clean=True, deflate=True)
                doc.close()
                if output_path.exists() and output_path.stat().st_size > 100:
                    decrypted = True
            except PDFBoltError:
                raise
            except Exception as e:
                logger.debug(f"PyMuPDF unlock attempt notice: {e}")

        # Engine 3: PyPDF Decryption
        if not decrypted:
            try:
                reader = PdfReader(str(input_pdf), strict=False)
                if reader.is_encrypted:
                    decrypt_success = reader.decrypt(password)
                    if decrypt_success == 0:
                        raise PDFBoltError("INVALID_PASSWORD", "Incorrect password provided for encrypted document.")

                writer = PdfWriter()
                for page in reader.pages:
                    writer.add_page(page)

                with open(output_path, "wb") as f:
                    writer.write(f)

                if output_path.exists() and output_path.stat().st_size > 100:
                    decrypted = True
            except PDFBoltError:
                raise
            except Exception as e:
                raise PDFBoltError("PROCESSING_FAILED", f"Decryption failed: {e}")

        if not output_path.exists() or output_path.stat().st_size < 100:
            raise PDFBoltError("PROCESSING_FAILED", "Failed to produce unlocked document.")

        # Post-validation: Output document must open cleanly without password
        try:
            unlocked_reader = PdfReader(str(output_path), strict=False)
            if unlocked_reader.is_encrypted:
                output_path.unlink(missing_ok=True)
                raise OutputValidationError("Output document is still encrypted after unlock operation.")
        except Exception as e:
            if isinstance(e, OutputValidationError):
                raise
            raise OutputValidationError(f"Repaired output validation failed: {e}")

        validate_pdf_output(output_path)
        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        password = str(self.settings.get("password") or "")
        temp_in = self.temp_dir / "in.pdf"
        temp_in.write_bytes(content)

        out_path = self.process([temp_in], {"password": password})
        out_bytes = out_path.read_bytes()

        return out_bytes, "unlocked_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "quality_status": "passed"
        }
