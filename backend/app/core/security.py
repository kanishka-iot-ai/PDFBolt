import os
import re
import uuid
import time
import zipfile
from pathlib import Path
from typing import Dict, Optional, Set
from backend.app.core.errors import PDFBoltError

ALLOWED_MIME_TYPES: Set[str] = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/octet-stream"
}

MAGIC_BYTES: Dict[str, bytes] = {
    "application/pdf": b"%PDF-",
    "image/jpeg": b"\xff\xd8\xff",
    "image/png": b"\x89PNG\r\n\x1a\n",
    "image/webp": b"RIFF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": b"PK\x03\x04",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": b"PK\x03\x04",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": b"PK\x03\x04",
}

BLOCKED_EXTENSIONS: Set[str] = {
    ".exe", ".bat", ".sh", ".php", ".js",
    ".py", ".rb", ".pl", ".cmd", ".vbs",
    ".dll", ".so", ".dylib"
}


def validate_magic_bytes(file_path: Path, mime_type: str) -> None:
    """Validate content signatures instead of trusting browser-supplied MIME alone."""
    if mime_type not in ALLOWED_MIME_TYPES:
        raise PDFBoltError("UNSUPPORTED_FORMAT")

    suffix = file_path.suffix.lower()
    if suffix in BLOCKED_EXTENSIONS:
        raise PDFBoltError("MALICIOUS_FILENAME")

    with open(file_path, "rb") as f:
        header = f.read(12)

    expected = MAGIC_BYTES.get(mime_type)
    if mime_type == "application/octet-stream":
        if suffix == ".pdf":
            expected = MAGIC_BYTES["application/pdf"]
        elif suffix in {".jpg", ".jpeg"}:
            expected = MAGIC_BYTES["image/jpeg"]
        elif suffix == ".png":
            expected = MAGIC_BYTES["image/png"]
        elif suffix == ".webp":
            expected = MAGIC_BYTES["image/webp"]
        elif suffix in {".docx", ".xlsx", ".pptx"}:
            expected = b"PK\x03\x04"
        else:
            raise PDFBoltError("UNSUPPORTED_FORMAT")

    if not expected:
        raise PDFBoltError("UNSUPPORTED_FORMAT")

    if not header.startswith(expected):
        raise PDFBoltError("INVALID_MAGIC_BYTES")

    if suffix == ".webp" and b"WEBP" not in header[8:12]:
        raise PDFBoltError("INVALID_MAGIC_BYTES")

    if suffix in {".docx", ".xlsx", ".pptx"}:
        try:
            with zipfile.ZipFile(file_path) as archive:
                names = set(archive.namelist())
        except zipfile.BadZipFile:
            raise PDFBoltError("INVALID_MAGIC_BYTES")

        required_member = {
            ".docx": "word/document.xml",
            ".xlsx": "xl/workbook.xml",
            ".pptx": "ppt/presentation.xml",
        }[suffix]
        if required_member not in names:
            raise PDFBoltError("INVALID_MAGIC_BYTES")


WINDOWS_RESERVED_NAMES: Set[str] = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
}


def sanitize_filename(filename: str) -> str:
    """
    Discard unsafe user characters, prevent path traversal,
    and return safe clean filename.
    """
    if not filename:
        return f"{uuid.uuid4()}.pdf"

    clean = filename.replace("\\", "/")
    while clean.startswith("../") or "/../" in clean:
        clean = re.sub(r'(\.\./)+', '', clean)

    if "/" in clean and not ("<" in clean and ">" in clean):
        clean = clean.split("/")[-1]

    clean = re.sub(r'[<>:"/\\|?*]', '_', clean)
    clean = clean.strip(". ")



    stem, ext = os.path.splitext(clean)
    if stem.upper() in WINDOWS_RESERVED_NAMES:
        clean = f"doc_{clean}"

    if not clean or clean.startswith('.'):
        clean = f"doc_{clean.lstrip('.')}"
    return clean[:255]



def check_path_traversal(path_str: str) -> None:
    """Reject any path containing .. or null bytes or dangerous extensions."""
    if ".." in path_str or "\x00" in path_str:
        raise PDFBoltError("PATH_TRAVERSAL")
    if any(path_str.lower().endswith(ext) for ext in BLOCKED_EXTENSIONS):
        raise PDFBoltError("MALICIOUS_FILENAME")


def validate_file_size(size_bytes: int, max_bytes: int) -> None:
    if size_bytes == 0:
        raise PDFBoltError("FILE_EMPTY")
    if size_bytes > max_bytes:
        raise PDFBoltError("FILE_TOO_LARGE")


class RateLimiter:
    """Simple in-memory sliding window rate limiter."""
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, list[float]] = {}

    def check_rate_limit(self, client_ip: str) -> bool:
        now = time.time()
        window_start = now - 60.0

        if client_ip not in self.requests:
            self.requests[client_ip] = []

        # Remove requests older than 1 minute
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if t > window_start
        ]

        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return False

        self.requests[client_ip].append(now)
        return True


rate_limiter = RateLimiter(requests_per_minute=60)
