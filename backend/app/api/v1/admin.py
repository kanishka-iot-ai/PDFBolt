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


def _require_admin(authorization: str = Header(default=""), x_admin_token: str = Header(default="", alias="X-Admin-Token")):
    token = ""
    if authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif x_admin_token:
        token = x_admin_token.strip()

    if not token or not verify_admin_token(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED_ADMIN", "message": "Admin authorization token is missing or invalid."}
        )
    return True


from backend.app.core.security import partner_registry
from typing import Optional

class CreateKeyPayload(BaseModel):
    name: str
    tier: str = "pro"
    rate_limit: Optional[int] = 300
    allowed_features: List[str] = ["*"]
    key_prefix: str = "pdfbolt_live_"


@router.get("/keys", summary="List all registered client API keys")
async def list_registered_keys(
    authorization: str = Header(default=""),
    x_admin_token: str = Header(default="", alias="X-Admin-Token")
):
    _require_admin(authorization, x_admin_token)
    keys = partner_registry.list_keys()
    return {
        "success": True,
        "count": len(keys),
        "keys": keys
    }


@router.post("/keys", summary="Generate & automatically activate new client API key on live server")
async def create_and_activate_key(
    payload: CreateKeyPayload,
    authorization: str = Header(default=""),
    x_admin_token: str = Header(default="", alias="X-Admin-Token")
):
    _require_admin(authorization, x_admin_token)

    # 1. Clean partner id slug
    clean_name = payload.name.strip() or "Client Partner"
    partner_id = clean_name.lower().replace(" ", "_")
    partner_id = "".join(c for c in partner_id if c.isalnum() or c == "_")
    if not partner_id:
        partner_id = f"partner_{int(time.time())}"

    # Append timestamp if conflict
    if any(k.get("partner_id") == partner_id for k in partner_registry.list_keys()):
        partner_id = f"{partner_id}_{int(time.time()) % 10000}"

    # 2. Generate 256-bit cryptographically secure key
    prefix = payload.key_prefix if payload.key_prefix in ["pdfbolt_live_", "pdfbolt_test_"] else "pdfbolt_live_"
    random_bytes = secrets.token_urlsafe(24)
    raw_key = f"{prefix}{random_bytes}"

    # 3. Rate limit selection
    rate_limit = payload.rate_limit
    if not rate_limit:
        rate_limit = 120 if payload.tier == "standard" else 300 if payload.tier == "pro" else 1000

    # 4. Features
    features = payload.allowed_features if (payload.allowed_features and len(payload.allowed_features) > 0) else ["*"]

    # 5. Automatically activate in server memory and persistent disk (Zero Render interaction needed!)
    identity = partner_registry.register_key(
        partner_id=partner_id,
        raw_key=raw_key,
        name=clean_name,
        tier=payload.tier,
        rate_limit=rate_limit,
        allowed_features=features
    )

    logger.info(f"Auto-activated client API key for '{clean_name}' (ID: {partner_id}, Features: {features})")

    return {
        "success": True,
        "activated_live": True,
        "partner_id": partner_id,
        "key": raw_key,
        "name": clean_name,
        "tier": payload.tier,
        "rate_limit": rate_limit,
        "allowed_features": features,
        "created_at": identity.created_at
    }


@router.delete("/keys/{partner_id}", summary="Revoke a client API key immediately")
async def revoke_client_key(
    partner_id: str,
    authorization: str = Header(default=""),
    x_admin_token: str = Header(default="", alias="X-Admin-Token")
):
    _require_admin(authorization, x_admin_token)
    deleted = partner_registry.delete_key(partner_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Partner key not found.")
    logger.info(f"Revoked client API key: {partner_id}")
    return {"success": True, "message": f"Partner key '{partner_id}' has been revoked immediately."}
