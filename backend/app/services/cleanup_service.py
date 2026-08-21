import os
import shutil
import time
import asyncio
import datetime
from pathlib import Path
from typing import Any, Optional
from backend.app.config import settings
from backend.app.core.logging import logger
from backend.app.models.schemas import JobStatus

TTL_MINUTES = 15
HARD_DELETE_MINUTES = 20


class CleanupService:
    """Automated, robust lifecycle manager for ephemeral document retention."""

    def __init__(self, storage_dir: Optional[str] = None):
        self.storage_dir = Path(storage_dir or settings.LOCAL_STORAGE_DIR)
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    def run_startup_cleanup(self) -> int:
        """Purges any orphaned files or leftover artifacts from prior crashes on server boot."""
        return self.run_20min_hard_safety_cleanup()

    def run_15min_ttl_cleanup(self, job_manager_instance: Any = None) -> int:
        """Synchronous 15-minute TTL pass for background workers and tests."""
        if not self.storage_dir.exists():
            return 0

        purged_count = 0
        now = datetime.datetime.now(datetime.timezone.utc)

        # 1. Clean up modern JobService jobs
        try:
            from backend.app.services.job_service import job_service
            if hasattr(job_service, "jobs"):
                for j_id, j_obj in list(job_service.jobs.items()):
                    exp_dt = getattr(j_obj, "expires_at", None)
                    if exp_dt:
                        if exp_dt.tzinfo is None:
                            exp_dt = exp_dt.replace(tzinfo=datetime.timezone.utc)
                        if now > exp_dt:
                            if hasattr(j_obj, "status"):
                                j_obj.status = getattr(j_obj.status, "EXPIRED", JobStatus.EXPIRED)
                            self.delete_job_files(j_id)
                            # Prune memory dictionary for jobs older than 1 hour
                            if (now - exp_dt).total_seconds() > 3600:
                                job_service.jobs.pop(j_id, None)
                            purged_count += 1
        except Exception as e:
            logger.debug(f"Modern job cleanup pass notice: {e}")

        # 2. Clean up legacy JobManager jobs
        if job_manager_instance and hasattr(job_manager_instance, "jobs"):
            for job_id, job_data in list(job_manager_instance.jobs.items()):
                created_str = job_data.get("created_at") if isinstance(job_data, dict) else getattr(job_data, "created_at", None)
                if created_str:
                    try:
                        created_dt = datetime.datetime.fromisoformat(created_str)
                        if created_dt.tzinfo is None:
                            created_dt = created_dt.replace(tzinfo=datetime.timezone.utc)
                        if (now - created_dt).total_seconds() > (TTL_MINUTES * 60):
                            if isinstance(job_data, dict):
                                job_data["status"] = JobStatus.EXPIRED
                            else:
                                job_data.status = JobStatus.EXPIRED
                            self.delete_job_files(job_id)
                            purged_count += 1
                    except Exception:
                        pass
        return purged_count

    def _force_remove(self, path: Path) -> bool:
        if not path.exists():
            return False
        try:
            if path.is_file():
                try:
                    os.chmod(str(path), 0o777)
                except Exception:
                    pass
                path.unlink(missing_ok=True)
            elif path.is_dir():
                def on_rm_error(func, p, exc_info):
                    try:
                        os.chmod(p, 0o777)
                        func(p)
                    except Exception:
                        pass
                shutil.rmtree(path, onerror=on_rm_error)
            return True
        except Exception:
            shutil.rmtree(path, ignore_errors=True)
            return not path.exists()

    def run_20min_hard_safety_cleanup(self) -> int:
        """Emergency hard delete pass purging anything on disk older than 20 minutes."""
        if not self.storage_dir.exists():
            return 0

        now = time.time()
        hard_limit = HARD_DELETE_MINUTES * 60
        purged = 0

        # Scan storage_dir and storage_dir/jobs
        scan_dirs = [self.storage_dir]
        jobs_sub = self.storage_dir / "jobs"
        if jobs_sub.exists():
            scan_dirs.append(jobs_sub)

        for s_dir in scan_dirs:
            if not s_dir.exists():
                continue
            for item in list(s_dir.iterdir()):
                if item.name == "jobs" and s_dir == self.storage_dir:
                    continue
                try:
                    is_stale = (now - item.stat().st_mtime) > hard_limit
                    if not is_stale and item.is_dir():
                        for root, dirs, files in os.walk(str(item)):
                            for f in files:
                                f_p = os.path.join(root, f)
                                try:
                                    if (now - os.path.getmtime(f_p)) > hard_limit:
                                        is_stale = True
                                        break
                                except Exception:
                                    pass
                            if is_stale:
                                break
                    if is_stale:
                        if self._force_remove(item):
                            purged += 1
                except Exception as e:
                    logger.warning(f"Error purging {item}: {e}")

        return purged

    def delete_job_files(self, job_id: str) -> bool:
        """Deletes all temporary files/directories associated with job_id."""
        deleted = False
        paths_to_check = [
            self.storage_dir / job_id,
            self.storage_dir / "jobs" / job_id
        ]
        for p in paths_to_check:
            if p.exists():
                if self._force_remove(p):
                    deleted = True
        return deleted


    async def execute_cleanup_cycle(self, job_manager_instance: Any = None) -> int:
        """Executes periodic cleanup pass."""
        ttl_purged = self.run_15min_ttl_cleanup(job_manager_instance)
        hard_purged = self.run_20min_hard_safety_cleanup()
        return ttl_purged + hard_purged

    async def start_periodic_worker(self, job_manager_instance: Any = None):
        """Runs background task checking TTL every 60 seconds."""
        self.is_running = True
        self.run_startup_cleanup()
        while self.is_running:
            try:
                await asyncio.sleep(60)
                await self.execute_cleanup_cycle(job_manager_instance)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup worker loop: {e}")

    def stop_worker(self):
        self.is_running = False

    async def handle_post_download_cleanup(self, job_id: str, job_manager_instance: Any = None):
        """Immediately cleans up temporary workspace after successful download."""
        self.delete_job_files(job_id)
        if job_manager_instance and hasattr(job_manager_instance, "jobs"):
            job = job_manager_instance.jobs.get(job_id)
            if job and isinstance(job, dict):
                out_path = job.get("output_path")
                if out_path and os.path.exists(out_path):
                    try:
                        os.remove(out_path)
                    except Exception:
                        pass

    def handle_job_failure(self, job_id: str, job_manager_instance: Any = None):
        """Immediately removes any partial files or artifacts from failed jobs."""
        self.delete_job_files(job_id)


cleanup_service = CleanupService()



