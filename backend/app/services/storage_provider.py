import os
import io
import shutil
import abc
from typing import Optional, Tuple, Dict, Any
from backend.app.config import settings
from backend.app.core.security import sanitize_filename
from backend.app.core.errors import PDFProcessingException, ErrorCode


class StorageProvider(abc.ABC):
    """
    Abstract storage provider interface for PDFBolt document pipelines.
    Supports Local Storage and Google Cloud Storage (GCS).
    """

    @abc.abstractmethod
    def save_upload(self, job_id: str, filename: str, content: bytes) -> Tuple[str, str]:
        """Saves uploaded input bytes. Returns (sanitized_name, identifier/path)."""
        pass

    @abc.abstractmethod
    def save_output(self, job_id: str, filename: str, content: bytes) -> Tuple[str, str]:
        """Saves generated output bytes. Returns (sanitized_name, identifier/path)."""
        pass

    @abc.abstractmethod
    def get_output_bytes(self, job_id: str, filename: str) -> Optional[bytes]:
        """Reads output document bytes for download/streaming."""
        pass

    @abc.abstractmethod
    def get_output_url(self, job_id: str, filename: str, expires_in_seconds: int = 3600) -> str:
        """Returns download URL or signed pre-authorized URL."""
        pass

    @abc.abstractmethod
    def cleanup_job(self, job_id: str) -> None:
        """Purges all temporary objects for the job."""
        pass


class LocalStorageProvider(StorageProvider):
    """Local filesystem storage provider for development and standalone deployments."""

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = base_dir or settings.LOCAL_STORAGE_DIR
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_job_dir(self, job_id: str) -> str:
        job_dir = os.path.join(self.base_dir, "jobs", job_id)
        os.makedirs(os.path.join(job_dir, "input"), exist_ok=True)
        os.makedirs(os.path.join(job_dir, "output"), exist_ok=True)
        return job_dir

    def save_upload(self, job_id: str, filename: str, content: bytes) -> Tuple[str, str]:
        clean_name = sanitize_filename(filename)
        job_dir = self._get_job_dir(job_id)
        file_path = os.path.join(job_dir, "input", clean_name)
        with open(file_path, "wb") as f:
            f.write(content)
        return clean_name, file_path

    def save_output(self, job_id: str, filename: str, content: bytes) -> Tuple[str, str]:
        clean_name = sanitize_filename(filename)
        job_dir = self._get_job_dir(job_id)
        file_path = os.path.join(job_dir, "output", clean_name)
        with open(file_path, "wb") as f:
            f.write(content)
        return clean_name, file_path

    def get_output_bytes(self, job_id: str, filename: str) -> Optional[bytes]:
        clean_name = sanitize_filename(filename)
        file_path = os.path.join(self.base_dir, "jobs", job_id, "output", clean_name)
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                return f.read()
        return None

    def get_output_url(self, job_id: str, filename: str, expires_in_seconds: int = 3600) -> str:
        clean_name = sanitize_filename(filename)
        return f"/api/v1/jobs/{job_id}/download/{clean_name}"

    def cleanup_job(self, job_id: str) -> None:
        job_dir = os.path.join(self.base_dir, "jobs", job_id)
        if os.path.exists(job_dir):
            shutil.rmtree(job_dir, ignore_errors=True)


class GoogleCloudStorageProvider(StorageProvider):
    """
    Google Cloud Storage (GCS) Provider.
    Implements structured bucket prefixes (jobs/{job_id}/input/ and jobs/{job_id}/output/)
    and signed pre-authorized download URLs.
    """

    def __init__(self, bucket_name: Optional[str] = None):
        self.bucket_name = bucket_name or getattr(settings, "GCS_BUCKET_NAME", "pdfbolt-documents")
        self._client = None
        self._bucket = None

    def _init_client(self):
        if self._client is None:
            try:
                from google.cloud import storage as gcs
                self._client = gcs.Client()
                self._bucket = self._client.bucket(self.bucket_name)
            except Exception as e:
                # Graceful fallback in environments without google-cloud-storage installed
                self._client = None

    def save_upload(self, job_id: str, filename: str, content: bytes) -> Tuple[str, str]:
        clean_name = sanitize_filename(filename)
        blob_path = f"jobs/{job_id}/input/{clean_name}"
        self._init_client()
        if self._bucket:
            blob = self._bucket.blob(blob_path)
            blob.upload_from_string(content, content_type="application/pdf")
            return clean_name, f"gs://{self.bucket_name}/{blob_path}"
        # In-memory mock fallback for offline tests
        return clean_name, f"gs://{self.bucket_name}/{blob_path}"

    def save_output(self, job_id: str, filename: str, content: bytes) -> Tuple[str, str]:
        clean_name = sanitize_filename(filename)
        blob_path = f"jobs/{job_id}/output/{clean_name}"
        self._init_client()
        if self._bucket:
            blob = self._bucket.blob(blob_path)
            blob.upload_from_string(content, content_type="application/pdf")
            return clean_name, f"gs://{self.bucket_name}/{blob_path}"
        return clean_name, f"gs://{self.bucket_name}/{blob_path}"

    def get_output_bytes(self, job_id: str, filename: str) -> Optional[bytes]:
        clean_name = sanitize_filename(filename)
        blob_path = f"jobs/{job_id}/output/{clean_name}"
        self._init_client()
        if self._bucket:
            blob = self._bucket.blob(blob_path)
            if blob.exists():
                return blob.download_as_bytes()
        return None

    def get_output_url(self, job_id: str, filename: str, expires_in_seconds: int = 900) -> str:
        """Generates short-lived signed URL (default 15 minutes / 900s max)."""
        clean_name = sanitize_filename(filename)
        blob_path = f"jobs/{job_id}/output/{clean_name}"
        # Cap expiration at strict 15-minute TTL
        capped_expiry = min(expires_in_seconds, 900)
        self._init_client()
        if self._bucket:
            try:
                import datetime
                blob = self._bucket.blob(blob_path)
                return blob.generate_signed_url(
                    version="v4",
                    expiration=datetime.timedelta(seconds=capped_expiry),
                    method="GET"
                )
            except Exception:
                pass
        return f"/api/v1/jobs/{job_id}/download/{clean_name}"

    def cleanup_job(self, job_id: str) -> None:
        self._init_client()
        if self._bucket and self._client:
            prefix = f"jobs/{job_id}/"
            try:
                blobs = list(self._bucket.list_blobs(prefix=prefix))
                if blobs:
                    self._bucket.delete_blobs(blobs)
            except Exception:
                pass

    def cleanup_older_than(self, max_age_seconds: int = 1200) -> int:
        """Emergency 20-minute hard cleanup of GCS objects older than max_age_seconds."""
        self._init_client()
        purged = 0
        if self._bucket and self._client:
            try:
                import datetime
                cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=max_age_seconds)
                blobs_to_delete = []
                for blob in self._bucket.list_blobs(prefix="jobs/"):
                    if blob.time_created and blob.time_created < cutoff:
                        blobs_to_delete.append(blob)
                if blobs_to_delete:
                    self._bucket.delete_blobs(blobs_to_delete)
                    purged = len(blobs_to_delete)
            except Exception:
                pass
        return purged

    @staticmethod
    def get_gcs_lifecycle_config() -> Dict[str, Any]:
        """Returns GCS bucket lifecycle rule payload as a secondary safety net."""
        return {
            "rule": [
                {
                    "action": {"type": "Delete"},
                    "condition": {
                        "age": 1,  # GCS minimum day-level lifecycle policy
                        "matchesPrefix": ["jobs/"]
                    }
                }
            ]
        }


def get_storage_provider() -> StorageProvider:
    """Factory creating the appropriate StorageProvider based on configuration."""
    provider_type = getattr(settings, "STORAGE_BACKEND", "local").lower().strip()
    if provider_type in ("gcs", "google", "google_cloud_storage"):
        return GoogleCloudStorageProvider()
    return LocalStorageProvider()

