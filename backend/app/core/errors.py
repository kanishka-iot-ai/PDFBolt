from typing import Optional, Dict, Any
from fastapi import Request
from fastapi.responses import JSONResponse

# Master Error Codes & Default Messages
ERROR_CODES: Dict[str, tuple[int, str]] = {
    # Input errors
    "FILE_EMPTY"               : (400, "Uploaded file is empty"),
    "INVALID_FILE"             : (400, "Invalid file provided"),
    "INVALID_PDF"              : (400, "File is not a valid PDF"),
    "CORRUPTED_PDF"            : (422, "PDF file is corrupted"),
    "INVALID_MAGIC_BYTES"      : (400, "File type mismatch"),
    "UNSUPPORTED_FORMAT"       : (400, "File format not supported"),
    "UNSUPPORTED_OPERATION"    : (400, "Operation not supported"),
    "FILE_TOO_LARGE"           : (413, "File exceeds size limit"),
    "PAGE_LIMIT_EXCEEDED"      : (400, "PDF has too many pages"),
    "NO_FILES_PROVIDED"        : (400, "No files uploaded"),
    "TOO_MANY_FILES"           : (400, "Too many files in request"),

    # Page/range errors
    "PAGE_OUT_OF_RANGE"        : (400, "Page number out of range"),
    "INVALID_PAGE_RANGE"       : (400, "Invalid page range format"),
    "INVALID_PARAMETER"        : (400, "Invalid parameter provided"),
    "DUPLICATE_PAGES"          : (400, "Duplicate pages in range"),

    # Security errors
    "PASSWORD_REQUIRED"        : (403, "PDF is encrypted, password needed"),
    "INVALID_PASSWORD"         : (403, "Incorrect password"),
    "MALICIOUS_FILENAME"       : (400, "Invalid filename detected"),
    "PATH_TRAVERSAL"           : (400, "Path traversal attempt detected"),

    # Processing errors
    "PROCESSING_FAILED"        : (500, "Processing failed"),
    "PROCESSING_TIMEOUT"       : (504, "Processing timed out"),
    "OUTPUT_VALIDATION_FAILED" : (500, "Output validation failed"),
    "OCR_FAILED"               : (500, "OCR processing failed"),
    "CONVERSION_FAILED"        : (500, "Conversion failed"),

    # Compression-specific
    "NO_SIZE_REDUCTION"        : (200, "No compression achieved"),

    # Job errors
    "JOB_NOT_FOUND"            : (404, "Job not found"),
    "JOB_EXPIRED"              : (410, "Job has expired"),
    "JOB_STILL_PROCESSING"     : (202, "Job is still processing"),
    "INVALID_DOWNLOAD_TOKEN"   : (401, "Invalid or expired download token"),

    # Rate limiting & Resources
    "RATE_LIMITED"             : (429, "Too many requests"),
    "SERVER_OVERLOADED"        : (503, "Server at capacity"),
    "MEMORY_LIMIT_EXCEEDED"    : (500, "Memory limit exceeded"),
    "STORAGE_ERROR"            : (500, "Storage operation failed"),
}


class PDFBoltError(Exception):
    """Base exception for all PDFBolt operations with structured error codes."""
    def __init__(self, code: str, detail: Optional[str] = None):
        self.code = code
        default_status, default_msg = ERROR_CODES.get(code, (500, "Internal error"))
        self.status_code = default_status
        self.message = detail or default_msg
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": False,
            "error": {
                "code": self.code,
                "message": self.message,
                "status_code": self.status_code
            }
        }


class OutputValidationError(PDFBoltError):
    """Raised when an output artifact fails integrity or invariant verification."""
    def __init__(self, detail: Optional[str] = None):
        super().__init__("OUTPUT_VALIDATION_FAILED", detail)


# Legacy backward-compatibility alias for existing test suites
class ErrorCode:
    FILE_EMPTY = "FILE_EMPTY"
    INVALID_PDF = "INVALID_PDF"
    CORRUPTED_PDF = "CORRUPTED_PDF"
    CORRUPTED_PDF_STRUCTURE = "CORRUPTED_PDF_STRUCTURE"
    INVALID_MAGIC_BYTES = "INVALID_MAGIC_BYTES"
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    PAGE_LIMIT_EXCEEDED = "PAGE_LIMIT_EXCEEDED"
    PAGE_COUNT_EXCEEDED = "PAGE_COUNT_EXCEEDED"
    PASSWORD_REQUIRED = "PASSWORD_REQUIRED"
    INVALID_PASSWORD = "INVALID_PASSWORD"
    PROCESSING_FAILED = "PROCESSING_FAILED"
    OUTPUT_VALIDATION_FAILED = "OUTPUT_VALIDATION_FAILED"
    JOB_NOT_FOUND = "JOB_NOT_FOUND"
    STORAGE_ERROR = "STORAGE_ERROR"
    RATE_LIMITED = "RATE_LIMITED"
    SECURITY_AUTH_FAILED = "SECURITY_AUTH_FAILED"



class PDFProcessingException(PDFBoltError):
    """Backward compatibility wrapper around PDFBoltError."""
    def __init__(self, error_code: str, message: str = "", status_code: Optional[int] = None, human_suggestion: Optional[str] = None):
        super().__init__(error_code, message)
        self.error_code = error_code
        if status_code is not None:
            self.status_code = status_code
        self.human_suggestion = human_suggestion



async def pdf_exception_handler(request: Request, exc: PDFBoltError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    from backend.app.config import settings

    public_message = str(exc) if settings.DEBUG or settings.APP_ENV.lower() != "production" else "An unexpected server error occurred."
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "PROCESSING_FAILED",
                "message": public_message,
                "status_code": 500
            }
        }
    )
