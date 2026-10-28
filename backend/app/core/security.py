import os
import re
import uuid
import time
import zipfile
import hashlib
import secrets
import ipaddress
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, Optional, Set, Any, List
from collections import OrderedDict
from fastapi import Request, HTTPException, Header, status
from backend.app.config import settings
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


def get_client_ip(request: Request) -> str:
    """
    Safely resolves client IP behind reverse proxies (Render, Cloudflare, Nginx).
    Prioritizes CF-Connecting-IP, True-Client-IP, and leftmost valid X-Forwarded-For IP.
    """
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        candidate = cf_ip.strip()
        try:
            ipaddress.ip_address(candidate)
            return candidate
        except ValueError:
            pass

    true_ip = request.headers.get("True-Client-IP")
    if true_ip:
        candidate = true_ip.strip()
        try:
            ipaddress.ip_address(candidate)
            return candidate
        except ValueError:
            pass

    xff = request.headers.get("X-Forwarded-For")
    if xff:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if parts:
            candidate = parts[0]
            try:
                ipaddress.ip_address(candidate)
                return candidate
            except ValueError:
                pass

    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


class RateLimiter:
    """
    Memory-bounded sliding-window rate limiter with LRU eviction and auto-purge.
    Prevents memory exhaustion attacks (DoS) from unbounded unique client IPs.
    """
    def __init__(self, requests_per_minute: int = 60, max_entries: int = 20000):
        self.requests_per_minute = requests_per_minute
        self.max_entries = max_entries
        self.requests: OrderedDict[str, list[float]] = OrderedDict()
        self._last_purge: float = time.time()

    def check_rate_limit(self, identifier: str, limit: Optional[int] = None) -> bool:
        max_requests = limit if limit is not None else self.requests_per_minute
        now = time.time()
        window_start = now - 60.0

        # Periodic cleanup of expired entries every 60 seconds
        if now - self._last_purge > 60.0:
            self._purge_stale_entries(now)

        if identifier in self.requests:
            self.requests.move_to_end(identifier)
            self.requests[identifier] = [t for t in self.requests[identifier] if t > window_start]
        else:
            if len(self.requests) >= self.max_entries:
                self.requests.popitem(last=False)
            self.requests[identifier] = []

        if len(self.requests[identifier]) >= max_requests:
            return False

        self.requests[identifier].append(now)
        return True

    def _purge_stale_entries(self, now: float):
        self._last_purge = now
        cutoff = now - 60.0
        keys_to_remove = [k for k, timestamps in self.requests.items() if not timestamps or timestamps[-1] <= cutoff]
        for k in keys_to_remove:
            self.requests.pop(k, None)


rate_limiter = RateLimiter(requests_per_minute=60, max_entries=getattr(settings, "MAX_RATE_LIMITER_ENTRIES", 20000))


import json
from dataclasses import field

@dataclass
class PartnerIdentity:
    partner_id: str
    name: str
    tier: str
    rate_limit_per_minute: int
    is_authenticated_partner: bool
    allowed_features: List[str] = field(default_factory=lambda: ["*"])
    created_at: str = ""

    def can_access_feature(self, feature_name: str) -> bool:
        """Determines if this partner key is authorized to execute the requested feature."""
        if not self.allowed_features or "*" in self.allowed_features or "all" in self.allowed_features:
            return True
        norm = feature_name.lower().replace("-", "_")
        allowed_norm = [f.lower().replace("-", "_") for f in self.allowed_features]
        return norm in allowed_norm or "*" in allowed_norm or "all" in allowed_norm


def hash_api_key(raw_key: str) -> str:
    """Computes SHA-256 digest of API key for secure lookup and constant-time check."""
    return hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()


class PartnerKeyRegistry:
    def __init__(self):
        self._key_hash_map: Dict[str, PartnerIdentity] = {}
        self._records_map: Dict[str, Dict[str, Any]] = {}
        self.reload_keys()

    def _get_storage_path(self) -> Path:
        base_dir = Path(getattr(settings, "TEMP_DIR", "/tmp/pdfbolt"))
        try:
            base_dir.mkdir(parents=True, exist_ok=True)
            return base_dir / "partner_keys_vault.json"
        except Exception:
            fallback = Path(__file__).resolve().parent.parent / "data"
            fallback.mkdir(parents=True, exist_ok=True)
            return fallback / "partner_keys_vault.json"

    def reload_keys(self):
        """Loads environment keys and dynamic persistent keys into memory."""
        self._key_hash_map.clear()
        self._records_map.clear()

        # 1. Environment Config Keys (render.yaml or ENV)
        raw_map = settings.PARTNER_API_KEYS if isinstance(settings.PARTNER_API_KEYS, dict) else {}
        for pid, pdata in raw_map.items():
            if isinstance(pdata, str):
                raw_key = pdata
                tier = "standard"
                rate_limit = settings.PARTNER_DEFAULT_RATE_LIMIT
                features = ["*"]
            elif isinstance(pdata, dict):
                raw_key = pdata.get("key", "")
                tier = pdata.get("tier", "standard")
                rate_limit = pdata.get("rate_limit", settings.PARTNER_DEFAULT_RATE_LIMIT)
                features = pdata.get("allowed_features") or pdata.get("features") or ["*"]
            else:
                continue

            if raw_key:
                khash = hash_api_key(raw_key)
                identity = PartnerIdentity(
                    partner_id=pid,
                    name=pid.replace("_", " ").title(),
                    tier=tier,
                    rate_limit_per_minute=rate_limit,
                    is_authenticated_partner=True,
                    allowed_features=features
                )
                self._key_hash_map[khash] = identity
                self._records_map[pid] = {
                    "partner_id": pid,
                    "name": identity.name,
                    "tier": tier,
                    "rate_limit": rate_limit,
                    "allowed_features": features,
                    "created_at": "Environment Config",
                    "key_preview": f"{raw_key[:14]}...{raw_key[-4:]}" if len(raw_key) > 18 else "***"
                }

        # 2. Dynamic Persistent Keys on Disk (Zero Render Manual Work)
        storage_file = self._get_storage_path()
        if storage_file.exists():
            try:
                with open(storage_file, "r", encoding="utf-8") as f:
                    dynamic_data = json.load(f)
                if isinstance(dynamic_data, dict):
                    for pid, pdata in dynamic_data.items():
                        raw_key = pdata.get("key", "")
                        tier = pdata.get("tier", "pro")
                        rate_limit = pdata.get("rate_limit", 300)
                        features = pdata.get("allowed_features", ["*"])
                        created_at = pdata.get("created_at", "Dynamic")
                        name = pdata.get("name", pid.replace("_", " ").title())

                        if raw_key:
                            khash = hash_api_key(raw_key)
                            self._key_hash_map[khash] = PartnerIdentity(
                                partner_id=pid,
                                name=name,
                                tier=tier,
                                rate_limit_per_minute=rate_limit,
                                is_authenticated_partner=True,
                                allowed_features=features,
                                created_at=created_at
                            )
                            self._records_map[pid] = {
                                "partner_id": pid,
                                "name": name,
                                "tier": tier,
                                "rate_limit": rate_limit,
                                "allowed_features": features,
                                "created_at": created_at,
                                "key_preview": f"{raw_key[:14]}...{raw_key[-4:]}"
                            }
            except Exception as e:
                pass

    def register_key(
        self,
        partner_id: str,
        raw_key: str,
        name: str,
        tier: str = "pro",
        rate_limit: int = 300,
        allowed_features: Optional[List[str]] = None,
        created_at: str = ""
    ) -> PartnerIdentity:
        """Dynamically registers and persists a key instantly without touching Render."""
        features = allowed_features if (allowed_features and len(allowed_features) > 0) else ["*"]
        khash = hash_api_key(raw_key)

        identity = PartnerIdentity(
            partner_id=partner_id,
            name=name,
            tier=tier,
            rate_limit_per_minute=rate_limit,
            is_authenticated_partner=True,
            allowed_features=features,
            created_at=created_at or time.strftime("%b %d, %Y, %I:%M %p")
        )

        self._key_hash_map[khash] = identity
        self._records_map[partner_id] = {
            "partner_id": partner_id,
            "name": name,
            "tier": tier,
            "rate_limit": rate_limit,
            "allowed_features": features,
            "created_at": identity.created_at,
            "key_preview": f"{raw_key[:14]}...{raw_key[-4:]}"
        }

        # Persist to disk
        storage_file = self._get_storage_path()
        try:
            current_data = {}
            if storage_file.exists():
                with open(storage_file, "r", encoding="utf-8") as f:
                    current_data = json.load(f)
            current_data[partner_id] = {
                "key": raw_key,
                "name": name,
                "tier": tier,
                "rate_limit": rate_limit,
                "allowed_features": features,
                "created_at": identity.created_at
            }
            with open(storage_file, "w", encoding="utf-8") as f:
                json.dump(current_data, f, indent=2)
        except Exception:
            pass

        return identity

    def delete_key(self, partner_id: str) -> bool:
        """Revokes a key in real-time from memory and persistent disk."""
        # Find hash to remove
        found = False
        target_hashes = [h for h, ident in self._key_hash_map.items() if ident.partner_id == partner_id]
        for h in target_hashes:
            self._key_hash_map.pop(h, None)
            found = True
        self._records_map.pop(partner_id, None)

        storage_file = self._get_storage_path()
        if storage_file.exists():
            try:
                with open(storage_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if partner_id in data:
                    del data[partner_id]
                    with open(storage_file, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2)
                    found = True
            except Exception:
                pass
        return found

    def list_keys(self) -> List[Dict[str, Any]]:
        """Returns metadata for all registered partner keys."""
        return list(self._records_map.values())

    def authenticate_key(self, raw_key: Optional[str]) -> Optional[PartnerIdentity]:
        if not raw_key:
            return None
        candidate_hash = hash_api_key(raw_key)
        for stored_hash, identity in self._key_hash_map.items():
            if secrets.compare_digest(candidate_hash, stored_hash):
                return identity
        return None


partner_registry = PartnerKeyRegistry()


def verify_partner_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    authorization: Optional[str] = Header(default=None),
    x_internal_token: Optional[str] = Header(default=None, alias="X-PDFBolt-Client-Token"),
) -> PartnerIdentity:
    """
    Hardened Multi-Factor Client Authenticator:
    1. Extracts API key from 'X-API-Key' or 'Authorization: Bearer <key>'.
    2. If key provided: validates via constant-time comparison against partner registry.
       If invalid -> raises 401 Unauthorized.
    3. If no key provided:
       - Validates first-party web app via Origin/Referer matching, Fetch Metadata, or internal token.
       - If external request and REQUIRE_API_KEY_FOR_EXTERNAL=True -> raises 401 Unauthorized.
       - Otherwise returns standard Web/Guest identity (ensuring 100% backward compatibility).
    """
    raw_key: Optional[str] = None
    
    # 1. Check Authorization Bearer header
    if authorization:
        if authorization.lower().startswith("bearer "):
            raw_key = authorization[7:].strip()
        elif not authorization.lower().startswith("basic "):
            raw_key = authorization.strip()

    # 2. Check X-API-Key header fallback
    if not raw_key and x_api_key:
        raw_key = x_api_key.strip()

    if raw_key:
        if not partner_registry._key_hash_map and settings.PARTNER_API_KEYS:
            partner_registry.reload_keys()

        partner = partner_registry.authenticate_key(raw_key)
        if not partner:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "INVALID_API_KEY",
                    "message": "The provided API key is invalid or inactive.",
                    "suggestion": "Check your X-API-Key or Authorization: Bearer <key> header."
                }
            )
        request.state.partner = partner
        return partner

    # 3. No API key provided: Check First-Party Web Origin & Referer & Client Handshake
    origin = request.headers.get("origin") or request.headers.get("referer") or ""
    is_trusted_origin = False
    if origin:
        for allowed in settings.CORS_ORIGINS:
            if origin.rstrip("/").startswith(allowed.rstrip("/")):
                is_trusted_origin = True
                break

    # Defense-in-depth: Validate Fetch Metadata (Sec-Fetch-Site) and internal token
    sec_fetch_site = request.headers.get("sec-fetch-site", "").lower()
    is_valid_fetch_site = sec_fetch_site in ("same-origin", "same-site", "none")

    configured_internal_token = getattr(settings, "FRONTEND_INTERNAL_TOKEN", "")
    is_valid_internal_token = False
    if configured_internal_token and x_internal_token:
        is_valid_internal_token = secrets.compare_digest(x_internal_token.strip(), configured_internal_token)

    # A verified web client has a trusted origin PLUS either valid fetch metadata or internal client token
    is_verified_web_client = is_trusted_origin and (is_valid_fetch_site or is_valid_internal_token or not settings.REQUIRE_API_KEY_FOR_EXTERNAL)

    # If strict external enforcement is enabled and request is not a verified web client
    if settings.REQUIRE_API_KEY_FOR_EXTERNAL and not is_verified_web_client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "API_KEY_REQUIRED",
                "message": "External API calls require an authenticated API key.",
                "suggestion": "Pass your partner key via 'X-API-Key' or 'Authorization: Bearer <key>'."
            }
        )

    # 4. Standard Guest / Web Client (Existing frontend & pytest suites)
    guest = PartnerIdentity(
        partner_id="public_web",
        name="PDFBolt Web User",
        tier="public",
        rate_limit_per_minute=settings.RATE_LIMIT_PER_MINUTE,
        is_authenticated_partner=False
    )
    request.state.partner = guest
    return guest

