import os
import time
import hmac
import hashlib
import secrets
from typing import Dict, List, Tuple
from fastapi import APIRouter, Request, HTTPException, Header, status
from pydantic import BaseModel
from backend.app.config import settings
from backend.app.core.security import get_client_ip
from backend.app.core.logging import logger

router = APIRouter(prefix="/admin", tags=["Admin Portal Security"])

# Server-Side Master Password & Signing Secret (Never exposed to client)
ADMIN_PASSWORD = os.getenv("ADMIN_PORTAL_PASSWORD", "Kkds@cuchd.in")
ADMIN_SECRET = os.getenv("ADMIN_TOKEN_SECRET", "pdfbolt_admin_hmac_secret_key_8849f2b901a")
TOKEN_TTL_SECONDS = 7200  # 2 Hours

# In-Memory Sliding-Window Brute-Force Rate Limiter
# Format: { client_ip: [(timestamp_failed_attempt), ...] }
_failed_attempts: Dict[str, List[float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 minutes


class AdminLoginRequest(BaseModel):
    password: str


def _check_brute_force_lockout(client_ip: str) -> None:
    now = time.time()
    cutoff = now - LOCKOUT_DURATION_SECONDS

    # Clean old attempts
    attempts = [t for t in _failed_attempts.get(client_ip, []) if t > cutoff]
    _failed_attempts[client_ip] = attempts

    if len(attempts) >= MAX_FAILED_ATTEMPTS:
        time_left = int(attempts[0] + LOCKOUT_DURATION_SECONDS - now)
        if time_left < 1:
            time_left = 1
        logger.warning(f"Admin login blocked for IP {client_ip} (locked out for {time_left}s)")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "BRUTE_FORCE_LOCKOUT",
                "message": f"Too many failed login attempts. This IP address has been temporarily locked out for {time_left} seconds.",
                "retry_after_seconds": time_left
            }
        )


def _record_failed_attempt(client_ip: str) -> int:
    now = time.time()
    cutoff = now - LOCKOUT_DURATION_SECONDS
    attempts = [t for t in _failed_attempts.get(client_ip, []) if t > cutoff]
    attempts.append(now)
    _failed_attempts[client_ip] = attempts
    return max(0, MAX_FAILED_ATTEMPTS - len(attempts))


def _generate_signed_admin_token() -> str:
    timestamp = str(int(time.time()))
    nonce = secrets.token_hex(8)
    message = f"admin:{timestamp}:{nonce}"
    signature = hmac.new(ADMIN_SECRET.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{timestamp}.{nonce}.{signature}"


def verify_admin_token(token: str) -> bool:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return False
        timestamp_str, nonce, signature = parts
        timestamp = int(timestamp_str)
        now = int(time.time())

        # Check token expiration (2 hours)
        if now - timestamp > TOKEN_TTL_SECONDS or timestamp > now + 300:
            return False

        message = f"admin:{timestamp_str}:{nonce}"
        expected_sig = hmac.new(ADMIN_SECRET.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
        return secrets.compare_digest(signature, expected_sig)
    except Exception:
        return False


@router.post("/auth/verify", summary="Verify admin password with constant-time comparison and anti-brute-force lockout")
async def verify_admin_login(request: Request, body: AdminLoginRequest):
    client_ip = get_client_ip(request)

    # 1. Enforce anti-brute-force lockout
    _check_brute_force_lockout(client_ip)

    # 2. Constant-time password check
    password_match = secrets.compare_digest(body.password.strip(), ADMIN_PASSWORD.strip())

    if not password_match:
        remaining = _record_failed_attempt(client_ip)
        logger.warning(f"Failed admin authentication attempt from {client_ip}. Remaining attempts: {remaining}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_ADMIN_PASSWORD",
                "message": "Access Denied: Invalid administrator password.",
                "remaining_attempts": remaining
            }
        )

    # 3. Successful login - clear failed attempts and issue signed HMAC session token
    _failed_attempts.pop(client_ip, None)
    admin_token = _generate_signed_admin_token()
    logger.info(f"Successful admin authentication from IP {client_ip}")

    return {
        "success": True,
        "authenticated": True,
        "token": admin_token,
        "expires_in_seconds": TOKEN_TTL_SECONDS
    }


@router.get("/auth/check", summary="Validate active admin session token")
async def check_admin_session(
    request: Request,
    authorization: str = Header(default="", alias="Authorization"),
    x_admin_token: str = Header(default="", alias="X-Admin-Token")
):
    token = ""
    if authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif x_admin_token:
        token = x_admin_token.strip()

    if not token or not verify_admin_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "SESSION_EXPIRED",
                "message": "Admin session is invalid or expired. Please re-authenticate."
            }
        )

    return {
        "success": True,
        "valid": True,
        "client_ip": get_client_ip(request)
    }
