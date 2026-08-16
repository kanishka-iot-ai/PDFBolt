import os
import shutil
import uuid
import aiofiles
from typing import Optional, Tuple
from backend.app.config import settings
from backend.app.core.errors import PDFProcessingException, ErrorCode
from backend.app.core.security import sanitize_filename


class StorageService:
    def __init__(self):
        self.base_dir = settings.LOCAL_STORAGE_DIR
        os.makedirs(self.base_dir, exist_ok=True)

    def get_job_dir(self, job_id: str) -> str:
        job_dir = os.path.join(self.base_dir, "jobs", job_id)
        os.makedirs(os.path.join(job_dir, "input"), exist_ok=True)
        os.makedirs(os.path.join(job_dir, "output"), exist_ok=True)
        return job_dir

    async def save_upload(self, job_id: str, filename: str, content: bytes) -> Tuple[str, str]:
        """
        Saves raw uploaded bytes into isolated job input directory.
        Returns (sanitized_filename, absolute_filepath).
        """
        clean_name = sanitize_filename(filename)
        job_dir = self.get_job_dir(job_id)
        file_path = os.path.join(job_dir, "input", clean_name)

        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        return clean_name, file_path

    async def save_output(self, job_id: str, filename: str, content: bytes) -> Tuple[str, str]:
        """
        Saves generated output bytes into isolated job output directory.
        Returns (sanitized_filename, absolute_filepath).
        """
        clean_name = sanitize_filename(filename)
        job_dir = self.get_job_dir(job_id)
        file_path = os.path.join(job_dir, "output", clean_name)

        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)

        return clean_name, file_path

    def save_output_sync(self, job_id: str, filename: str, content: bytes) -> Tuple[str, str]:
        """
        Synchronous save for thread pool / direct worker execution.
        """
        clean_name = sanitize_filename(filename)
        job_dir = self.get_job_dir(job_id)
        file_path = os.path.join(job_dir, "output", clean_name)

        with open(file_path, "wb") as f:
            f.write(content)

        return clean_name, file_path

    def save_upload_sync(self, job_id: str, filename: str, content: bytes) -> Tuple[str, str]:
        clean_name = sanitize_filename(filename)
        job_dir = self.get_job_dir(job_id)
        file_path = os.path.join(job_dir, "input", clean_name)

        with open(file_path, "wb") as f:
            f.write(content)

        return clean_name, file_path

    def get_output_path(self, job_id: str, filename: str) -> Optional[str]:
        clean_name = sanitize_filename(filename)
        job_dir = os.path.join(self.base_dir, "jobs", job_id, "output")
        path = os.path.join(job_dir, clean_name)
        if os.path.exists(path):
            return path
        return None

    def cleanup_job(self, job_id: str) -> None:
        """
        Removes all temporary files associated with a job.
        """
        job_dir = os.path.join(self.base_dir, "jobs", job_id)
        if os.path.exists(job_dir):
            try:
                shutil.rmtree(job_dir, ignore_errors=True)
            except Exception as e:
                pass


storage = StorageService()
