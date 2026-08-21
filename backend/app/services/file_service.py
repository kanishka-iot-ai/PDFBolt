import os
import uuid
from pathlib import Path
from typing import List, Tuple
from fastapi import UploadFile
from backend.app.config import settings
from backend.app.core.errors import PDFBoltError
from backend.app.core.security import validate_magic_bytes, sanitize_filename, validate_file_size, check_path_traversal
from backend.app.core.validation import validate_pdf_file
from backend.app.models.file import FileMetadata


class FileService:
    """Manages input file validation, security scanning, and workspace preparation."""

    @staticmethod
    async def save_upload(upload: UploadFile, target_path: Path) -> FileMetadata:
        """Reads upload stream in bounded chunks, validates size and magic bytes, and saves to target_path with 0600 perms."""
        target_path.parent.mkdir(parents=True, exist_ok=True)
        safe_name = sanitize_filename(upload.filename or target_path.name)
        check_path_traversal(safe_name)

        chunk_size = 1024 * 1024  # 1 MB chunk
        size_bytes = 0
        with open(target_path, "wb") as f:
            while True:
                chunk = await upload.read(chunk_size)
                if not chunk:
                    break
                size_bytes += len(chunk)
                if size_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                    f.close()
                    target_path.unlink(missing_ok=True)
                    raise PDFBoltError("FILE_TOO_LARGE")
                f.write(chunk)

        if size_bytes == 0:
            target_path.unlink(missing_ok=True)
            raise PDFBoltError("FILE_EMPTY")

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
            sanitized_name=safe_name,
            mime_type=mime_type,
            size_bytes=size_bytes,
            page_count=page_count,
            path=str(target_path)
        )


file_service = FileService()
