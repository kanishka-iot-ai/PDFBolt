import os
import uuid
from pathlib import Path
from typing import List, Tuple
from fastapi import UploadFile
from backend.app.config import settings
from backend.app.core.errors import PDFBoltError
from backend.app.core.security import validate_magic_bytes, sanitize_filename, validate_file_size
from backend.app.core.validation import validate_pdf_file
from backend.app.models.file import FileMetadata


class FileService:
    """Manages input file validation, security scanning, and workspace preparation."""

    @staticmethod
    async def save_upload(upload: UploadFile, target_path: Path) -> FileMetadata:
        """Reads upload stream, validates size and magic bytes, and saves to target_path with 0600 perms."""
        target_path.parent.mkdir(parents=True, exist_ok=True)
        content = await upload.read()
        size_bytes = len(content)

        # Step 8: Size check
        validate_file_size(size_bytes, settings.MAX_UPLOAD_SIZE_BYTES)

        # Write to disk
        with open(target_path, "wb") as f:
            f.write(content)

        # Restrict permissions (0600 on POSIX, no-op on Windows)
        try:
            os.chmod(target_path, 0o600)
        except Exception:
            pass

        # Step 5 & 6: Validate MIME & Magic Bytes
        mime_type = upload.content_type or "application/pdf"
        try:
            validate_magic_bytes(target_path, mime_type)
        except PDFBoltError:
            # Clean up immediately if validation fails
            target_path.unlink(missing_ok=True)
            raise

        # Step 7 & 9: PDF Structure & Page count check if PDF
        page_count = None
        if mime_type == "application/pdf" or target_path.suffix.lower() == ".pdf":
            try:
                page_count = validate_pdf_file(target_path)
                if page_count > settings.MAX_PAGE_LIMIT:
                    target_path.unlink(missing_ok=True)
                    raise PDFBoltError("PAGE_LIMIT_EXCEEDED")
            except PDFBoltError:
                target_path.unlink(missing_ok=True)
                raise
            except Exception as e:
                target_path.unlink(missing_ok=True)
                raise PDFBoltError("INVALID_PDF", str(e))

        file_id = target_path.stem
        return FileMetadata(
            file_id=file_id,
            original_name=upload.filename or f"{file_id}.pdf",
            sanitized_name=sanitize_filename(upload.filename or f"{file_id}.pdf"),
            mime_type=mime_type,
            size_bytes=size_bytes,
            page_count=page_count,
            path=str(target_path)
        )


file_service = FileService()
