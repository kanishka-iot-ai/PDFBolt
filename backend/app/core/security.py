import os
import re
import uuid
import time
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
}

BLOCKED_EXTENSIONS: Set[str] = {
    ".exe", ".bat", ".sh", ".php", ".js",
    ".py", ".rb", ".pl", ".cmd", ".vbs",
    ".dll", ".so", ".dylib"
}


def validate_magic_bytes(file_path: Path, mime_type: str) -> None:
    """Read first 8 bytes. Verify against known magic bytes."""
    expected = MAGIC_BYTES.get(mime_type)
    if not expected:
        # If MIME type is in allowed non-image/non-pdf formats or unknown, try PDF header check
        with open(file_path, "rb") as f:
            header = f.read(8)
        if mime_type == "application/pdf" and not header.startswith(b"%PDF-"):
            raise PDFBoltError("INVALID_MAGIC_BYTES")
        return

    with open(file_path, "rb") as f:
        header = f.read(8)
    if not header.startswith(expected):
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
