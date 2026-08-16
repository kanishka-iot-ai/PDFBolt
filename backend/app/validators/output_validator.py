import io
from typing import Optional
import pypdf
from backend.app.core.errors import PDFProcessingException, ErrorCode


class OutputValidator:
    @staticmethod
    def validate_non_empty(output_bytes: bytes) -> None:
        if not output_bytes or len(output_bytes) == 0:
            raise PDFProcessingException(
                error_code=ErrorCode.OUTPUT_EMPTY,
                message="Processing engine generated a zero-byte output file.",
                status_code=500,
                human_suggestion="Please retry with different processing parameters."
            )

    @classmethod
    def validate_pdf_output(cls, output_bytes: bytes, expected_pages: Optional[int] = None) -> int:
        """
        Validates that output is a readable, syntactically correct PDF document.
        Returns the confirmed page count.
        """
        cls.validate_non_empty(output_bytes)

        if len(output_bytes) < 5 or not output_bytes.startswith(b"%PDF-"):
            raise PDFProcessingException(
                error_code=ErrorCode.OUTPUT_INVALID,
                message="Generated output is missing valid PDF header bytes.",
                status_code=500
            )

        try:
            reader = pypdf.PdfReader(io.BytesIO(output_bytes))
            page_count = len(reader.pages)

            if page_count == 0:
                raise PDFProcessingException(
                    error_code=ErrorCode.OUTPUT_INVALID,
                    message="Generated PDF output contains zero pages.",
                    status_code=500
                )

            if expected_pages is not None and page_count != expected_pages:
                raise PDFProcessingException(
                    error_code=ErrorCode.QUALITY_CHECK_FAILED,
                    message=f"Page count mismatch: expected {expected_pages}, got {page_count}.",
                    status_code=500
                )

            return page_count
        except PDFProcessingException:
            raise
        except Exception as e:
            raise PDFProcessingException(
                error_code=ErrorCode.OUTPUT_INVALID,
                message=f"Generated PDF output failed structural validation: {str(e)}",
                status_code=500
            )

    @classmethod
    def validate_openxml_output(cls, output_bytes: bytes, format_name: str = "DOCX") -> None:
        """
        Validates that output is a valid OpenXML/ZIP container (for docx, xlsx, pptx).
        """
        cls.validate_non_empty(output_bytes)

        if len(output_bytes) < 4 or not output_bytes.startswith(b"PK\x03\x04"):
            raise PDFProcessingException(
                error_code=ErrorCode.OUTPUT_INVALID,
                message=f"Generated {format_name} output is not a valid OpenXML container.",
                status_code=500
            )
