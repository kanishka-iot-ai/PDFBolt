import re
import os
import time
from typing import Dict, Tuple
from collections import defaultdict
from backend.app.core.errors import PDFProcessingException, ErrorCode
from backend.app.config import settings


# Windows / POSIX Reserved names and illegal characters
ILLEGAL_CHARS_PATTERN = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
WINDOWS_RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
}


def sanitize_filename(filename: str) -> str:
    """
    Sanitizes user-provided filenames, preventing path traversal and illegal character injections.
    """
    if not filename:
        return "document.pdf"

    clean_name = filename.replace('\x00', '')
    
    # Handle path traversals and directory structures
    if '/' in clean_name or '\\' in clean_name:
        if clean_name.startswith(('.', '/', '\\')) or '..' in clean_name or '/etc/' in clean_name or '\\etc\\' in clean_name:
            clean_name = clean_name.replace('\\', '/').split('/')[-1]
        else:
            clean_name = clean_name.replace('/', '_').replace('\\', '_')
    
    # Strip null bytes and illegal control/special chars
    clean_name = ILLEGAL_CHARS_PATTERN.sub('_', clean_name)
    
    # Strip consecutive dots to prevent traversal
    clean_name = re.sub(r'\.{2,}', '.', clean_name)
    clean_name = clean_name.strip(' .')

    if not clean_name:
        clean_name = "document.pdf"

    # Check for Windows reserved names
    base_stem = clean_name.split('.')[0].upper()
    if base_stem in WINDOWS_RESERVED_NAMES:
        clean_name = f"doc_{clean_name}"

    # Truncate maximum filename length
    if len(clean_name) > 150:
        parts = clean_name.rsplit('.', 1)
        if len(parts) == 2:
            clean_name = parts[0][:140] + '.' + parts[1]
        else:
            clean_name = clean_name[:145]

    return clean_name


class RateLimiter:
    """
    In-memory token bucket rate limiter.
    """
    def __init__(self, requests_per_minute: int = 60):
        self.rate = requests_per_minute
        self.records: Dict[str, list] = defaultdict(list)

    def check_rate_limit(self, client_ip: str) -> bool:
        now = time.time()
        window = 60.0
        # Filter timestamps within current window
        self.records[client_ip] = [t for t in self.records[client_ip] if now - t < window]

        if len(self.records[client_ip]) >= self.rate:
            return False

        self.records[client_ip].append(now)
        return True


rate_limiter = RateLimiter(settings.RATE_LIMIT_PER_MINUTE)
