import io
from typing import Tuple, Optional
import pypdf
from backend.app.core.errors import PDFProcessingException, ErrorCode
from backend.app.config import settings


MAGIC_BYTES = {
    "pdf": b"%PDF-",
    "zip": b"PK\x03\x04",
    "png": b"\x89PNG\r\n\x1a\n",
    "jpeg": b"\xff\xd8\xff",
    "webp": b"RIFF"
}


class InputValidator:
    @staticmethod
    def validate_file_size(content: bytes, max_bytes: int = settings.MAX_UPLOAD_SIZE_BYTES) -> None:
        if not content or len(content) == 0:
            raise PDFProcessingException(
                error_code=ErrorCode.FILE_EMPTY,
                message="Uploaded file is empty (0 bytes).",
                status_code=400,
                human_suggestion="Please select a valid non-empty document."
            )

        if len(content) > max_bytes:
            mb = len(content) / (1024 * 1024)
            limit_mb = max_bytes / (1024 * 1024)
            raise PDFProcessingException(
                error_code=ErrorCode.FILE_TOO_LARGE,
                message=f"File size ({mb:.2f}MB) exceeds the maximum allowed limit of {limit_mb:.0f}MB.",
                status_code=413,
                human_suggestion=f"Please upload a document smaller than {limit_mb:.0f}MB or compress it first."
            )

    @staticmethod
    def sniff_magic_bytes(content: bytes) -> str:
        """
        Determines actual file format from header signatures, ignoring client MIME types and extensions.
        """
        if len(content) >= 5 and content.startswith(b"%PDF-"):
            return "pdf"
        elif len(content) >= 4 and content.startswith(b"PK\x03\x04"):
            return "zip"  # Can be docx, xlsx, pptx, or standard zip
        elif len(content) >= 8 and content.startswith(b"\x89PNG\r\n\x1a\n"):
            return "png"
        elif len(content) >= 3 and content.startswith(b"\xff\xd8\xff"):
            return "jpeg"
        elif len(content) >= 12 and content.startswith(b"RIFF") and b"WEBP" in content[8:12]:
            return "webp"
        
        return "unknown"

    @classmethod
    def validate_pdf_structure(cls, content: bytes, password: Optional[str] = None) -> Tuple[int, bool]:
        """
        Validates PDF structure by parsing the xref table and page tree.
        Returns (page_count, is_encrypted).
        """
        cls.validate_file_size(content)
        detected_type = cls.sniff_magic_bytes(content)

        if detected_type != "pdf":
            raise PDFProcessingException(
                error_code=ErrorCode.INVALID_MAGIC_BYTES,
                message="File is not a valid PDF document (missing %PDF- magic bytes).",
                status_code=400,
                human_suggestion="Please ensure the file is an intact PDF document."
            )

        try:
            reader = pypdf.PdfReader(io.BytesIO(content))
            
            if reader.is_encrypted:
                if password:
                    decrypt_success = reader.decrypt(password)
                    if decrypt_success == 0:
                        raise PDFProcessingException(
                            error_code=ErrorCode.INVALID_PASSWORD,
                            message="Incorrect password provided for encrypted PDF.",
                            status_code=401,
                            human_suggestion="Please verify your document password."
                        )
                else:
                    return 0, True

            num_pages = len(reader.pages)
            if num_pages == 0:
                raise PDFProcessingException(
                    error_code=ErrorCode.CORRUPTED_PDF_STRUCTURE,
                    message="PDF contains 0 pages.",
                    status_code=400
                )

            if num_pages > settings.MAX_PAGE_LIMIT:
                raise PDFProcessingException(
                    error_code=ErrorCode.PAGE_COUNT_EXCEEDED,
                    message=f"PDF has {num_pages} pages, which exceeds the max limit of {settings.MAX_PAGE_LIMIT}.",
                    status_code=400
                )

            return num_pages, False

        except PDFProcessingException:
            raise
        except Exception as e:
            raise PDFProcessingException(
                error_code=ErrorCode.CORRUPTED_PDF_STRUCTURE,
                message=f"Failed to parse PDF document structure: {str(e)}",
                status_code=400,
                human_suggestion="The PDF appears corrupted. Try opening and re-saving it in Adobe Acrobat or Chrome."
            )
