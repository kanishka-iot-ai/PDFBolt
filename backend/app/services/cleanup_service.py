import os
import time
import shutil
import datetime
import asyncio
from typing import Dict, Any, List, Optional
from backend.app.config import settings
from backend.app.core.logging import logger
from backend.app.models.schemas import JobStatus


class CleanupService:
    """
    15-Minute Document Auto-Deletion Engine & 20-Minute Hard Safety Purge.
    Enforces strict zero-retention ephemeral document lifecycle across
    local filesystem, temporary worker caches, and Google Cloud Storage (GCS).
    """

    def __init__(self):
        self.local_storage_dir = settings.LOCAL_STORAGE_DIR
        self.ttl_seconds = settings.PROCESSING_FILE_TTL_SECONDS  # 15 minutes (900s)
        self.hard_ttl_seconds = settings.HARD_SAFETY_TTL_SECONDS # 20 minutes (1200s)
        self._running = False
        self._worker_task: Optional[asyncio.Task] = None

    def delete_job_files(self, job_id: str, storage_provider=None) -> bool:
        """
        Idempotently deletes all input, output, and partial temporary files for a job.
        Safe against race conditions, missing directories, or multiple calls.
        """
        deleted_anything = False

        # 1. Local filesystem cleanup
        job_dir = os.path.join(self.local_storage_dir, "jobs", job_id)
        if os.path.exists(job_dir):
            try:
                shutil.rmtree(job_dir, ignore_errors=True)
                deleted_anything = True
            except Exception as e:
                logger.warning(f"Error removing local job dir {job_id}: {str(e)}", extra={"job_id": job_id})

        # Also check /tmp/pdfbolt/jobs/{job_id} if configured
        tmp_job_dir = os.path.join("/tmp", "pdfbolt", "jobs", job_id)
        if os.path.exists(tmp_job_dir):
            try:
                shutil.rmtree(tmp_job_dir, ignore_errors=True)
                deleted_anything = True
            except Exception:
                pass

        # 2. Cloud Storage Provider Cleanup if available
        if storage_provider:
            try:
                storage_provider.cleanup_job(job_id)
                deleted_anything = True
            except Exception as e:
                logger.warning(f"Error purging cloud storage for job {job_id}: {str(e)}", extra={"job_id": job_id})

        return deleted_anything

    def handle_job_cancellation(self, job_id: str, job_manager) -> bool:
        """
        Immediately deletes all input/output files and marks job CANCELLED.
        """
        job = job_manager.jobs.get(job_id)
        if not job:
            return False

        job["status"] = JobStatus.CANCELLED
        job["deleted_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        job["output_path"] = None

        self.delete_job_files(job_id)
        logger.info(f"Job {job_id} cancelled by user. Temporary files purged immediately.", extra={"job_id": job_id})
        return True

    def handle_job_failure(self, job_id: str, job_manager) -> None:
        """
        Immediately purges temporary input/partial artifacts upon processing failure.
        """
        self.delete_job_files(job_id)
        job = job_manager.jobs.get(job_id)
        if job:
            job["deleted_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            job["output_path"] = None
        logger.info(f"Failed job {job_id} artifacts purged.", extra={"job_id": job_id})

    def handle_post_download_cleanup(self, job_id: str, job_manager) -> None:
        """
        Purges output file immediately following user download.
        """
        self.delete_job_files(job_id)
        job = job_manager.jobs.get(job_id)
        if job:
            job["deleted_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
            job["output_path"] = None
        logger.info(f"Job {job_id} downloaded by user. Temporary files purged.", extra={"job_id": job_id})

    def run_15min_ttl_cleanup(self, job_manager) -> int:
        """
        Scans all active job metadata. Purges files for any job older than 15 minutes (900s).
        Returns number of expired jobs purged.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        purged_count = 0

        for job_id, job in list(job_manager.jobs.items()):
            try:
                created_dt = datetime.datetime.fromisoformat(job["created_at"])
                age_seconds = (now - created_dt).total_seconds()

                if age_seconds >= self.ttl_seconds and job["status"] != JobStatus.DELETED:
                    self.delete_job_files(job_id)
                    job["status"] = JobStatus.EXPIRED
                    job["deleted_at"] = now.isoformat()
                    job["output_path"] = None
                    purged_count += 1
                    logger.info(f"Job {job_id} reached 15-minute TTL ({int(age_seconds)}s). Auto-deleted.", extra={"job_id": job_id})
            except Exception as e:
                logger.error(f"Error checking TTL for job {job_id}: {str(e)}", extra={"job_id": job_id})

        return purged_count

    def run_20min_hard_safety_cleanup(self) -> int:
        """
        Hard Safety Emergency Purge (independent of application state / in-memory jobs).
        Directly scans local storage directories and cloud buckets for any temporary directory
        created > 20 minutes ago (1200s). Purges abandoned/crashed worker directories.
        Returns number of physical directories purged.
        """
        now_ts = time.time()
        purged_count = 0

        jobs_base = os.path.join(self.local_storage_dir, "jobs")
        if os.path.exists(jobs_base):
            for entry in os.listdir(jobs_base):
                entry_path = os.path.join(jobs_base, entry)
                if os.path.isdir(entry_path):
                    try:
                        mtime = os.path.getmtime(entry_path)
                        age_seconds = now_ts - mtime
                        if age_seconds >= self.hard_ttl_seconds:
                            def _onerror(func, path, exc_info):
                                import stat
                                try:
                                    os.chmod(path, stat.S_IWRITE)
                                    func(path)
                                except Exception:
                                    pass
                            shutil.rmtree(entry_path, onerror=_onerror)
                            purged_count += 1
                            logger.info(f"[Hard Safety 20-Min Cleanup] Purged abandoned directory: {entry} (Age: {int(age_seconds)}s)")
                    except Exception as e:
                        logger.warning(f"Failed to inspect/purge {entry_path}: {str(e)}")

        return purged_count

    def run_qr_share_cleanup(self) -> int:
        """
        Scans all QR shares and purges expired cloud objects.
        """
        try:
            from backend.app.services.qr_share_manager import qr_share_manager
            return qr_share_manager.cleanup_expired_shares()
        except Exception as e:
            logger.error(f"Error running QR share cleanup: {str(e)}")
            return 0

    async def start_periodic_worker(self, job_manager):
        """
        Background worker loop running every cleanup interval.
        """
        self._running = True
        logger.info("Temporary document auto-deletion background worker started.")
        while self._running:
            try:
                # 1. Run 15-min application TTL cleanup
                self.run_15min_ttl_cleanup(job_manager)
                # 2. Run 20-min emergency hard safety cleanup
                self.run_20min_hard_safety_cleanup()
                # 3. Run QR Share expiration cleanup
                self.run_qr_share_cleanup()
            except Exception as e:
                logger.error(f"Cleanup worker iteration error: {str(e)}")
            
            await asyncio.sleep(settings.CLEANUP_INTERVAL_SECONDS)

    def stop_worker(self):
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()


cleanup_service = CleanupService()
