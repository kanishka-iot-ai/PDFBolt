from enum import Enum
from typing import Optional, Dict, Any
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class ErrorCode(str, Enum):
    # Validation Errors
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    FILE_EMPTY = "FILE_EMPTY"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    INVALID_MAGIC_BYTES = "INVALID_MAGIC_BYTES"
    PATH_TRAVERSAL_DETECTED = "PATH_TRAVERSAL_DETECTED"
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT"
    
    # PDF Integrity Errors
    INVALID_PDF = "INVALID_PDF"
    CORRUPTED_PDF_STRUCTURE = "CORRUPTED_PDF_STRUCTURE"
    ENCRYPTED_PDF = "ENCRYPTED_PDF"
    PASSWORD_REQUIRED = "PASSWORD_REQUIRED"
    INVALID_PASSWORD = "INVALID_PASSWORD"
    PAGE_COUNT_EXCEEDED = "PAGE_COUNT_EXCEEDED"
    INVALID_PAGE_RANGE = "INVALID_PAGE_RANGE"
    
    # Processing Errors
    PROCESSING_FAILED = "PROCESSING_FAILED"
    PROCESSING_TIMEOUT = "PROCESSING_TIMEOUT"
    ENGINE_UNAVAILABLE = "ENGINE_UNAVAILABLE"
    
    # Output Integrity Errors
    OUTPUT_INVALID = "OUTPUT_INVALID"
    OUTPUT_EMPTY = "OUTPUT_EMPTY"
    OUTPUT_TOO_LARGE = "OUTPUT_TOO_LARGE"
    QUALITY_CHECK_FAILED = "QUALITY_CHECK_FAILED"
    NO_REDUCTION_ACHIEVED = "NO_REDUCTION_ACHIEVED"
    
    # Storage & System
    JOB_NOT_FOUND = "JOB_NOT_FOUND"
    STORAGE_ERROR = "STORAGE_ERROR"
    RATE_LIMITED = "RATE_LIMITED"
    SECURITY_AUTH_FAILED = "SECURITY_AUTH_FAILED"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"


class PDFProcessingException(Exception):
    def __init__(
        self,
        error_code: ErrorCode,
        message: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None,
        human_suggestion: Optional[str] = None
    ):
        super().__init__(message)
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        self.human_suggestion = human_suggestion or "Please review your document and try again."


async def pdf_exception_handler(request: Request, exc: PDFProcessingException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code.value,
                "message": exc.message,
                "suggestion": exc.human_suggestion,
                "details": exc.details
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": ErrorCode.INTERNAL_SERVER_ERROR.value,
                "message": "An unexpected error occurred during document processing.",
                "suggestion": "Please try again later or contact support if the issue persists.",
                "details": {}
            }
        }
    )
