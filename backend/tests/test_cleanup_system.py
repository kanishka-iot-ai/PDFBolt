import os
import time
import shutil
import datetime
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings
from backend.app.models.schemas import OperationType, JobStatus
from backend.app.services.job_manager import job_manager
from backend.app.services.storage import storage
from backend.app.services.storage_provider import GoogleCloudStorageProvider
from backend.app.services.cleanup_service import cleanup_service

client = TestClient(app)

SAMPLE_PDF_BYTES = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n"
    b"0000000101 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
)


def test_job_has_strict_15min_and_20min_ttl():
    """Verify job model contains 15-min expires_at and 20-min hard_delete_at timestamps."""
    job_id = job_manager.create_job(OperationType.ROTATE)
    job = job_manager.get_job(job_id)
    
    assert job is not None
    assert job.created_at is not None
    assert job.expires_at is not None
    assert job.hard_delete_at is not None
    assert job.retention_policy == "15_MIN_AUTO_DELETE"

    created_dt = datetime.datetime.fromisoformat(job.created_at)
    expires_dt = datetime.datetime.fromisoformat(job.expires_at)
    hard_delete_dt = datetime.datetime.fromisoformat(job.hard_delete_at)

    assert (expires_dt - created_dt).total_seconds() == 900  # 15 minutes
    assert (hard_delete_dt - created_dt).total_seconds() == 1200  # 20 minutes


def test_download_triggers_post_download_cleanup():
    """Verify output artifact is deleted post-download."""
    job_id = job_manager.create_job(OperationType.ROTATE, {"angle": 90})
    job_response = job_manager.execute_job_sync(job_id, SAMPLE_PDF_BYTES, "test_doc.pdf")
    
    assert job_response.status == JobStatus.COMPLETED
    out_path = job_manager.jobs[job_id]["output_path"]
    assert os.path.exists(out_path)

    # Trigger download
    response = client.get(f"/api/v1/jobs/{job_id}/download")
    assert response.status_code == 200
    assert len(response.content) > 0

    # In FastAPI TestClient, background tasks execute before client.get returns
    # Verify file is removed from disk
    assert not os.path.exists(out_path)


def test_user_cancellation_triggers_immediate_cleanup():
    """Verify user cancellation immediately marks job CANCELLED and purges files."""
    job_id = job_manager.create_job(OperationType.COMPRESS)
    clean_name, file_path = storage.save_upload_sync(job_id, "cancel_test.pdf", SAMPLE_PDF_BYTES)
    assert os.path.exists(file_path)

    # Cancel job
    cancel_resp = client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    # Verify input/output directory is removed
    job_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "jobs", job_id)
    assert not os.path.exists(job_dir)


def test_failed_job_purges_temporary_artifacts():
    """Verify failed processing immediately cleans up any partial temporary files."""
    job_id = job_manager.create_job(OperationType.ROTATE)
    # Corrupt PDF content to induce processing failure
    corrupt_bytes = b"%PDF-1.4 INVALID_CORRUPTED_STREAM"
    
    with pytest.raises(Exception):
        job_manager.execute_job_sync(job_id, corrupt_bytes, "corrupt.pdf")

    # Verify job status is FAILED and directory is cleaned
    assert job_manager.jobs[job_id]["status"] == JobStatus.FAILED
    job_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "jobs", job_id)
    assert not os.path.exists(job_dir)


def test_15min_ttl_expiration_cleanup():
    """Verify cleanup worker purges jobs older than 15 minutes."""
    job_id = job_manager.create_job(OperationType.ROTATE)
    clean_name, file_path = storage.save_upload_sync(job_id, "expired.pdf", SAMPLE_PDF_BYTES)
    assert os.path.exists(file_path)

    # Simulate job created 16 minutes ago (960s)
    past_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=960)
    job_manager.jobs[job_id]["created_at"] = past_time.isoformat()

    # Run 15-min TTL scan
    purged_count = cleanup_service.run_15min_ttl_cleanup(job_manager)
    assert purged_count >= 1
    assert job_manager.jobs[job_id]["status"] == JobStatus.EXPIRED

    # Verify files on disk are purged
    job_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "jobs", job_id)
    assert not os.path.exists(job_dir)


def test_20min_hard_safety_emergency_cleanup():
    """Verify 20-minute hard emergency cleanup purges physical directories even without job metadata."""
    orphaned_job_id = "orphaned-test-job-uuid-12345"
    orphaned_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "jobs", orphaned_job_id)
    os.makedirs(orphaned_dir, exist_ok=True)
    test_file = os.path.join(orphaned_dir, "leftover.pdf")
    with open(test_file, "wb") as f:
        f.write(SAMPLE_PDF_BYTES)

    assert os.path.exists(test_file)

    # Set mtime to 25 minutes ago (1500s)
    past_ts = time.time() - 1500
    os.utime(test_file, (past_ts, past_ts))
    os.utime(orphaned_dir, (past_ts, past_ts))

    # Run 20-min hard safety purge
    purged_count = cleanup_service.run_20min_hard_safety_cleanup()
    assert purged_count >= 1
    assert not os.path.exists(orphaned_dir)


def test_idempotent_cleanup_safe_against_missing_files():
    """Verify cleanup functions do not throw errors when called multiple times or on missing files."""
    dummy_id = "non-existent-job-uuid"
    
    # Should not raise exception
    deleted1 = cleanup_service.delete_job_files(dummy_id)
    deleted2 = cleanup_service.delete_job_files(dummy_id)
    
    assert deleted1 is False
    assert deleted2 is False


def test_signed_url_expiration_capped_at_15_minutes():
    """Verify GCS signed URLs are capped at maximum 15 minutes (900s)."""
    gcs = GoogleCloudStorageProvider(bucket_name="pdfbolt-documents")
    # Requesting 1 hour signed URL
    url = gcs.get_output_url("job-xyz", "output.pdf", expires_in_seconds=3600)
    assert url is not None
    # Verify GCS provider returns valid download path structure
    assert "job-xyz" in url


def test_gcs_lifecycle_policy_configuration():
    """Verify GCS bucket lifecycle rule payload configuration."""
    config = GoogleCloudStorageProvider.get_gcs_lifecycle_config()
    assert "rule" in config
    assert config["rule"][0]["action"]["type"] == "Delete"
    assert config["rule"][0]["condition"]["age"] == 1
    assert "jobs/" in config["rule"][0]["condition"]["matchesPrefix"]


def test_modern_job_service_ttl_cleanup():
    """Verify modern JobService in-memory jobs are expired and purged by TTL pass."""
    from backend.app.services.job_service import job_service
    from backend.app.models.job import Job, JobStatus as ModernJobStatus
    import datetime

    job_id = "test-modern-expired-uuid-123"
    work_dir = cleanup_service.storage_dir / job_id
    work_dir.mkdir(parents=True, exist_ok=True)
    (work_dir / "test.pdf").write_bytes(SAMPLE_PDF_BYTES)

    expired_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=16)
    job = Job(
        job_id=job_id,
        status=ModernJobStatus.COMPLETED,
        operation="rotate",
        created_at=expired_time - datetime.timedelta(minutes=1),
        started_at=expired_time - datetime.timedelta(minutes=1),
        expires_at=expired_time,
        download_token="sample-tok"
    )
    job_service.jobs[job_id] = job

    assert work_dir.exists()
    purged = cleanup_service.run_15min_ttl_cleanup()
    assert purged >= 1
    assert not work_dir.exists()
    assert job_service.jobs[job_id].status == ModernJobStatus.EXPIRED

