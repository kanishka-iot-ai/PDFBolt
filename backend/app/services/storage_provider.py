import os
import shutil
import aiofiles
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Tuple
from backend.app.config import settings
from backend.app.core.logging import logger


class StorageProvider(ABC):
    """Abstract interface for storing uploaded and generated documents."""

    @abstractmethod
    async def save(self, source: Path, key: str) -> str:
        pass

    @abstractmethod
    async def read(self, key: str, dest: Path) -> None:
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        pass

    @abstractmethod
    async def get_download_url(self, key: str, ttl_s: int = 900) -> str:
        pass


class LocalStorageProvider(StorageProvider):
    """Default local filesystem storage provider. Zero external cloud requirements."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = Path(base_dir or settings.LOCAL_STORAGE_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_path(self, key: str) -> Path:
        clean_key = key.replace("\\", "/").lstrip("/")
        return self.base_dir / clean_key

    async def save(self, source: Path, key: str) -> str:
        dest = self._get_path(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if source.resolve() != dest.resolve():
            shutil.copyfile(source, dest)
        return str(dest)

    async def read(self, key: str, dest: Path) -> None:
        src = self._get_path(key)
        if not src.exists():
            raise FileNotFoundError(f"Storage key '{key}' not found locally.")
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)

    async def delete(self, key: str) -> None:
        path = self._get_path(key)
        if path.is_file():
            path.unlink(missing_ok=True)
        elif path.is_dir():
            shutil.rmtree(path, ignore_errors=True)

    async def exists(self, key: str) -> bool:
        return self._get_path(key).exists()

    async def get_download_url(self, key: str, ttl_s: int = 900) -> str:
        return f"/api/v1/jobs/{key}/download"

    # Legacy synchronous helpers
    def save_upload(self, job_id: str, original_filename: str, content: bytes) -> Tuple[str, str]:
        job_dir = self.base_dir / "jobs" / job_id / "input"
        job_dir.mkdir(parents=True, exist_ok=True)
        target = job_dir / original_filename
        with open(target, "wb") as f:
            f.write(content)
        return original_filename, str(target)

    def save_output(self, job_id: str, original_filename: str, content: bytes) -> Tuple[str, str]:
        job_dir = self.base_dir / "jobs" / job_id / "output"
        job_dir.mkdir(parents=True, exist_ok=True)
        target = job_dir / original_filename
        with open(target, "wb") as f:
            f.write(content)
        return original_filename, str(target)

    def get_output_bytes(self, job_id: str, filename: str) -> Optional[bytes]:
        target = self.base_dir / "jobs" / job_id / "output" / filename
        if target.exists():
            with open(target, "rb") as f:
                return f.read()
        # check without jobs subdir
        alt = self.base_dir / job_id / "output" / filename
        if alt.exists():
            with open(alt, "rb") as f:
                return f.read()
        return None

    def cleanup_job(self, job_id: str) -> None:
        p1 = self.base_dir / "jobs" / job_id
        if p1.exists():
            shutil.rmtree(p1, ignore_errors=True)
        p2 = self.base_dir / job_id
        if p2.exists():
            shutil.rmtree(p2, ignore_errors=True)

    def get_output_url(self, job_id: str, filename: str, expires_in_seconds: int = 900) -> str:
        return f"/api/v1/jobs/{job_id}/download/{filename}"


class AzureBlobStorageProvider(StorageProvider):
    """Azure Blob Storage adapter."""
    def __init__(self, conn_str: Optional[str] = None, container_name: str = "pdfbolt-documents"):
        self.conn_str = conn_str
        self.container_name = container_name
        self.local_fallback = LocalStorageProvider()

    async def save(self, source: Path, key: str) -> str:
        if self.conn_str:
            try:
                from azure.storage.blob.aio import BlobServiceClient
                async with BlobServiceClient.from_connection_string(self.conn_str) as client:
                    blob_client = client.get_blob_client(container=self.container_name, blob=key)
                    async with aiofiles.open(source, 'rb') as data:
                        await blob_client.upload_blob(await data.read(), overwrite=True)
                return f"azure://{self.container_name}/{key}"
            except Exception as e:
                logger.warning(f"Azure save fallback: {e}")
        return await self.local_fallback.save(source, key)

    async def read(self, key: str, dest: Path) -> None:
        if self.conn_str:
            try:
                from azure.storage.blob.aio import BlobServiceClient
                async with BlobServiceClient.from_connection_string(self.conn_str) as client:
                    blob_client = client.get_blob_client(container=self.container_name, blob=key)
                    stream = await blob_client.download_blob()
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    async with aiofiles.open(dest, 'wb') as f:
                        await f.write(await stream.readall())
                return
            except Exception as e:
                logger.warning(f"Azure read fallback: {e}")
        await self.local_fallback.read(key, dest)

    async def delete(self, key: str) -> None:
        if self.conn_str:
            try:
                from azure.storage.blob.aio import BlobServiceClient
                async with BlobServiceClient.from_connection_string(self.conn_str) as client:
                    blob_client = client.get_blob_client(container=self.container_name, blob=key)
                    await blob_client.delete_blob()
                return
            except Exception:
                pass
        await self.local_fallback.delete(key)

    async def exists(self, key: str) -> bool:
        if self.conn_str:
            try:
                from azure.storage.blob.aio import BlobServiceClient
                async with BlobServiceClient.from_connection_string(self.conn_str) as client:
                    blob_client = client.get_blob_client(container=self.container_name, blob=key)
                    return await blob_client.exists()
            except Exception:
                pass
        return await self.local_fallback.exists(key)

    async def get_download_url(self, key: str, ttl_s: int = 900) -> str:
        return f"/api/v1/jobs/{key}/download"

    # Legacy synchronous helpers
    def save_upload(self, job_id: str, original_filename: str, content: bytes) -> Tuple[str, str]:
        path = f"az://{self.container_name}/jobs/{job_id}/input/{original_filename}"
        return original_filename, path

    def save_output(self, job_id: str, original_filename: str, content: bytes) -> Tuple[str, str]:
        path = f"az://{self.container_name}/jobs/{job_id}/output/{original_filename}"
        return original_filename, path

    def get_output_url(self, job_id: str, filename: str, expires_in_seconds: int = 900) -> str:
        return f"/api/v1/jobs/{job_id}/download/{filename}"


class GoogleCloudStorageProvider(StorageProvider):
    """Google Cloud Storage provider adapter."""
    def __init__(self, bucket_name: str = "pdfbolt-storage"):
        self.bucket_name = bucket_name
        self.local_fallback = LocalStorageProvider()

    async def save(self, source: Path, key: str) -> str:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(self.bucket_name)
            blob = bucket.blob(key)
            blob.upload_from_filename(str(source))
            return f"gs://{self.bucket_name}/{key}"
        except Exception as e:
            logger.warning(f"GCS save fallback: {e}")
            return await self.local_fallback.save(source, key)

    async def read(self, key: str, dest: Path) -> None:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(self.bucket_name)
            blob = bucket.blob(key)
            dest.parent.mkdir(parents=True, exist_ok=True)
            blob.download_to_filename(str(dest))
        except Exception as e:
            logger.warning(f"GCS read fallback: {e}")
            await self.local_fallback.read(key, dest)

    async def delete(self, key: str) -> None:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(self.bucket_name)
            blob = bucket.blob(key)
            blob.delete()
        except Exception:
            await self.local_fallback.delete(key)

    async def exists(self, key: str) -> bool:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(self.bucket_name)
            blob = bucket.blob(key)
            return blob.exists()
        except Exception:
            return await self.local_fallback.exists(key)

    async def get_download_url(self, key: str, ttl_s: int = 900) -> str:
        return f"/api/v1/jobs/{key}/download"

    # Legacy synchronous helpers
    def save_upload(self, job_id: str, original_filename: str, content: bytes) -> Tuple[str, str]:
        path = f"gs://{self.bucket_name}/jobs/{job_id}/input/{original_filename}"
        return original_filename, path

    def save_output(self, job_id: str, original_filename: str, content: bytes) -> Tuple[str, str]:
        path = f"gs://{self.bucket_name}/jobs/{job_id}/output/{original_filename}"
        return original_filename, path

    def get_output_url(self, job_id: str, filename: str, expires_in_seconds: int = 900) -> str:
        return f"/api/v1/jobs/{job_id}/download/{filename}"

    @staticmethod
    def get_gcs_lifecycle_config():
        return {
            "rule": [{
                "action": {"type": "Delete"},
                "condition": {"age": 1, "matchesPrefix": ["jobs/"]}
            }]
        }


def get_storage_provider() -> StorageProvider:
    backend = str(getattr(settings, "STORAGE_BACKEND", "local")).lower()
    if backend in ["azure", "azure_blob"]:
        return AzureBlobStorageProvider(
            conn_str=getattr(settings, "AZURE_STORAGE_CONNECTION_STRING", None),
            container_name=getattr(settings, "AZURE_STORAGE_CONTAINER_NAME", "pdfbolt-documents")
        )
    elif backend in ["gcs", "google", "gcp"]:
        return GoogleCloudStorageProvider(getattr(settings, "GCS_BUCKET_NAME", "pdfbolt-storage"))
    return LocalStorageProvider()


storage_provider = get_storage_provider()
