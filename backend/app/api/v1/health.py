from fastapi import APIRouter
from backend.app.config import settings
import os

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV
    }


@router.get("/ready")
def readiness_check():
    # Verify local storage writeability
    is_storage_ready = os.path.exists(settings.LOCAL_STORAGE_DIR) and os.access(settings.LOCAL_STORAGE_DIR, os.W_OK)
    
    return {
        "status": "ready" if is_storage_ready else "degraded",
        "storage": "ok" if is_storage_ready else "unwritable",
        "version": settings.APP_VERSION
    }


@router.get("/version")
def version_check():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION
    }
