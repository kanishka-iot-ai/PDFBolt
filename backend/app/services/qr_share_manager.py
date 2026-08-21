import os
import shutil
import secrets
import hashlib
import hmac
import datetime
from typing import Dict, Any, Optional, Tuple, List
from backend.app.config import settings
from backend.app.core.logging import logger
from backend.app.core.security import sanitize_filename
from backend.app.core.errors import PDFProcessingException, ErrorCode
from backend.app.models.qr_share import QRShareStatus, QRShareResponse


class QRShareManager:
    """
    Dedicated Cloud Storage & Retention Manager for QR PDF Sharing.
    Enforces user-selected temporary cloud retention (15m, 1h, 24h [default], 7d, 30d).
    Generates unguessable cryptographic share IDs, short-lived download URLs,
    and supports instant user revocation and background auto-deletion.
    """

    def __init__(self):
        self.base_dir = settings.LOCAL_STORAGE_DIR
        self.qr_storage_dir = os.path.join(self.base_dir, "qr_shares")
        os.makedirs(self.qr_storage_dir, exist_ok=True)
        self.shares: Dict[str, Dict[str, Any]] = {}

    def _get_share_dir(self, share_id: str) -> str:
        share_dir = os.path.join(self.qr_storage_dir, share_id)
        os.makedirs(share_dir, exist_ok=True)
        return share_dir

    @staticmethod
    def _hash_secret(secret: str, salt: str) -> str:
        return hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt.encode("utf-8"), 120000).hex()

    @classmethod
    def _verify_secret(cls, provided: Optional[str], salt: Optional[str], expected_hash: Optional[str]) -> bool:
        if not expected_hash or not salt:
            return True
        if not provided:
            return False
        return hmac.compare_digest(cls._hash_secret(provided, salt), expected_hash)

    def create_share(
        self,
        content: bytes,
        filename: str,
        duration_seconds: int = 86400,
        pin: Optional[str] = None,
        one_time_scan: bool = False
    ) -> QRShareResponse:
        """
        Creates a new temporary QR cloud share with unguessable cryptographic ID.
        """
        # Validate allowed duration
        allowed_durations = [900, 3600, 86400, 604800, 2592000]
        if duration_seconds not in allowed_durations:
            duration_seconds = 86400  # Default to 24 hours

        share_id = secrets.token_urlsafe(16)
        revocation_token = secrets.token_urlsafe(32)
        revocation_salt = secrets.token_urlsafe(16)
        pin_salt = secrets.token_urlsafe(16) if pin else None
        clean_name = sanitize_filename(filename or "shared_document.pdf")

        # Save physical file into private storage
        share_dir = self._get_share_dir(share_id)
        file_path = os.path.join(share_dir, clean_name)
        with open(file_path, "wb") as f:
            f.write(content)

        now_dt = datetime.datetime.now(datetime.timezone.utc)
        expires_dt = now_dt + datetime.timedelta(seconds=duration_seconds)

        share_data = {
            "share_id": share_id,
            "filename": clean_name,
            "file_size_bytes": len(content),
            "file_path": file_path,
            "object_key": f"qr_shares/{share_id}/{clean_name}",
            "created_at": now_dt.isoformat(),
            "expires_at": expires_dt.isoformat(),
            "duration_seconds": duration_seconds,
            "status": QRShareStatus.ACTIVE,
            "revocation_token_hash": self._hash_secret(revocation_token, revocation_salt),
            "revocation_token_salt": revocation_salt,
            "pin_hash": self._hash_secret(pin, pin_salt) if pin and pin_salt else None,
            "pin_salt": pin_salt,
            "one_time_scan": one_time_scan,
            "download_count": 0
        }
        self.shares[share_id] = share_data

        logger.info(f"Created QR Share {share_id} (TTL: {duration_seconds}s, Size: {len(content)}B)")

        return QRShareResponse(
            share_id=share_id,
            filename=clean_name,
            file_size_bytes=len(content),
            created_at=now_dt.isoformat(),
            expires_at=expires_dt.isoformat(),
            status=QRShareStatus.ACTIVE,
            share_url=f"https://pdfbolt.in/s/{share_id}",
            download_url=f"/api/v1/qr-shares/{share_id}/download",
            revocation_token=revocation_token,
            one_time_scan=one_time_scan,
            require_pin=bool(pin),
            is_expired=False,
            duration_seconds=duration_seconds
        )

    def get_share(self, share_id: str, pin: Optional[str] = None) -> QRShareResponse:
        """
        Retrieves QR share metadata and validates expiration and PIN.
        """
        share = self.shares.get(share_id)
        if not share:
            raise PDFProcessingException(ErrorCode.JOB_NOT_FOUND, "QR Share not found.", 404)

        # Check revocation
        if share["status"] == QRShareStatus.REVOKED:
            raise PDFProcessingException(ErrorCode.PROCESSING_FAILED, "This QR share has been revoked and the file has been deleted.", 410)

        # Check expiration
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        expires_dt = datetime.datetime.fromisoformat(share["expires_at"])
        if now_dt > expires_dt or share["status"] == QRShareStatus.EXPIRED:
            self._purge_share_file(share_id)
            share["status"] = QRShareStatus.EXPIRED
            raise PDFProcessingException(ErrorCode.PROCESSING_FAILED, "This QR share has expired and the file has been deleted.", 410)

        # Check PIN if required
        if share.get("pin_hash"):
            if not self._verify_secret(pin, share.get("pin_salt"), share.get("pin_hash")):
                raise PDFProcessingException(ErrorCode.SECURITY_AUTH_FAILED, "Invalid or missing PIN for this QR share.", 403)

        return QRShareResponse(
            share_id=share_id,
            filename=share["filename"],
            file_size_bytes=share["file_size_bytes"],
            created_at=share["created_at"],
            expires_at=share["expires_at"],
            status=share["status"],
            share_url=f"https://pdfbolt.in/s/{share_id}",
            download_url=f"/api/v1/qr-shares/{share_id}/download",
            revocation_token=None,  # Do not expose revocation token publicly
            one_time_scan=share["one_time_scan"],
            require_pin=bool(share.get("pin_hash")),
            is_expired=False,
            duration_seconds=share["duration_seconds"]
        )

    def get_file_for_download(self, share_id: str, pin: Optional[str] = None) -> Tuple[str, str]:
        """
        Validates access and returns (file_path, filename) for download.
        Handles one-time scan auto-purge.
        """
        share = self.shares.get(share_id)
        if not share:
            raise PDFProcessingException(ErrorCode.JOB_NOT_FOUND, "QR Share not found.", 404)

        if share["status"] in (QRShareStatus.EXPIRED, QRShareStatus.REVOKED, QRShareStatus.DELETED):
            raise PDFProcessingException(ErrorCode.PROCESSING_FAILED, "This QR share is no longer available.", 410)

        now_dt = datetime.datetime.now(datetime.timezone.utc)
        expires_dt = datetime.datetime.fromisoformat(share["expires_at"])
        if now_dt > expires_dt:
            self._purge_share_file(share_id)
            share["status"] = QRShareStatus.EXPIRED
            raise PDFProcessingException(ErrorCode.PROCESSING_FAILED, "This QR share has expired and the file has been deleted.", 410)

        if share.get("pin_hash") and not self._verify_secret(pin, share.get("pin_salt"), share.get("pin_hash")):
            raise PDFProcessingException(ErrorCode.SECURITY_AUTH_FAILED, "Invalid PIN.", 403)

        file_path = share.get("file_path")
        if not file_path or not os.path.exists(file_path):
            raise PDFProcessingException(ErrorCode.STORAGE_ERROR, "Shared document file missing from storage.", 404)

        share["download_count"] += 1
        return file_path, share["filename"]

    def purge_one_time_share(self, share_id: str) -> None:
        """Purges one-time share file after successful download transfer."""
        share = self.shares.get(share_id)
        if share:
            self._purge_share_file(share_id)
            share["status"] = QRShareStatus.DELETED
            share["file_path"] = None
            logger.info(f"One-time QR share {share_id} purged after initial download.")

    def revoke_share(self, share_id: str, revocation_token: str) -> bool:
        """
        Allows the owner to immediately revoke and purge the shared file.
        """
        share = self.shares.get(share_id)
        if not share:
            raise PDFProcessingException(ErrorCode.JOB_NOT_FOUND, "QR Share not found.", 404)

        if not self._verify_secret(revocation_token, share.get("revocation_token_salt"), share.get("revocation_token_hash")):
            raise PDFProcessingException(ErrorCode.SECURITY_AUTH_FAILED, "Invalid revocation token.", 403)

        self._purge_share_file(share_id)
        share["status"] = QRShareStatus.REVOKED
        share["file_path"] = None
        logger.info(f"QR Share {share_id} revoked by owner. Document purged immediately.")
        return True

    def _purge_share_file(self, share_id: str) -> bool:
        """
        Idempotently deletes physical files for the QR share.
        """
        share_dir = os.path.join(self.qr_storage_dir, share_id)
        if os.path.exists(share_dir):
            try:
                shutil.rmtree(share_dir, ignore_errors=True)
                return True
            except Exception as e:
                logger.warning(f"Error purging QR share dir {share_id}: {str(e)}")
        return False

    def cleanup_expired_shares(self) -> int:
        """
        Scans all QR shares and purges expired files.
        """
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        purged = 0

        for share_id, share in list(self.shares.items()):
            try:
                expires_dt = datetime.datetime.fromisoformat(share["expires_at"])
                if now_dt > expires_dt and share["status"] == QRShareStatus.ACTIVE:
                    self._purge_share_file(share_id)
                    share["status"] = QRShareStatus.EXPIRED
                    share["file_path"] = None
                    purged += 1
                    logger.info(f"QR Share {share_id} expired. Auto-deleted.")
            except Exception as e:
                logger.error(f"Error during QR cleanup for {share_id}: {str(e)}")

        return purged


qr_share_manager = QRShareManager()
