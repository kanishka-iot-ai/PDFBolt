import os
import sys
import time
import warnings

# Alias fitz to pymupdf to prevent PyMuPDF's legacy message_warning on startup from third-party packages (e.g. pdf2docx)
try:
    import pymupdf
    sys.modules["fitz"] = pymupdf
except Exception:
    pass

# Suppress PyMuPDF legacy fitz deprecation warning
warnings.filterwarnings("ignore", message=".*The 'fitz' API is deprecated.*")

# Ensure Fontconfig cache directory is writable in containerized environments (Render, Docker)
_cache_dir = os.path.join(os.environ.get("XDG_CACHE_HOME", "/tmp/.cache"), "fontconfig")
try:
    os.makedirs(_cache_dir, exist_ok=True)
except Exception:
    pass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from backend.app.config import settings
from backend.app.core.errors import PDFProcessingException, pdf_exception_handler, generic_exception_handler
from backend.app.core.security import rate_limiter
from backend.app.core.logging import logger
from backend.app.api.v1.router import api_v1_router
from backend.app.api.v1.health import router as root_health_router

import asyncio
from contextlib import asynccontextmanager
from backend.app.services.cleanup_service import cleanup_service
from backend.app.services.job_manager import job_manager


def _prewarm_engines():
    """Warms fontconfig cache and LibreOffice engine on Render container startup so the first request is instant."""
    try:
        import shutil
        import subprocess
        for bin_name in ["libreoffice", "soffice", "libreoffice.exe", "soffice.exe"]:
            p = shutil.which(bin_name)
            if p:
                logger.info(f"Pre-warming LibreOffice engine on Render ({p})...")
                profile_dir = "/tmp/libreoffice_profile" if os.name != 'nt' else os.path.join(os.environ.get("TEMP", "/tmp"), "lo_profile")
                os.makedirs(profile_dir, exist_ok=True)
                subprocess.run(
                    [p, f"-env:UserInstallation=file://{profile_dir}", "--headless", "--version"],
                    capture_output=True,
                    timeout=15
                )
                logger.info("LibreOffice pre-warming complete.")
                break
    except Exception as e:
        logger.debug(f"LibreOffice engine pre-warming notice: {e}")


async def _render_keepalive_worker():
    """Optional background keep-alive ping for Render Free Tier to prevent sleep during active usage."""
    external_url = os.environ.get("RENDER_EXTERNAL_URL") or os.environ.get("BACKEND_KEEP_ALIVE_URL")
    if not external_url:
        return
    url = f"{external_url.rstrip('/')}/health"
    logger.info(f"Render keep-alive worker started targeting {url}")
    while True:
        try:
            await asyncio.sleep(780)  # 13 minutes (Render free tier sleeps after 15m idle)
            import urllib.request
            req = urllib.request.Request(url, headers={"User-Agent": "PDFBolt-Render-KeepAlive/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                logger.debug(f"Render keep-alive ping status: {resp.status}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.debug(f"Render keep-alive ping notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch periodic 15-min and 20-min temporary file auto-cleanup worker
    cleanup_task = asyncio.create_task(cleanup_service.start_periodic_worker(job_manager))

    # Startup: Launch Render keep-alive worker (if configured)
    keepalive_task = asyncio.create_task(_render_keepalive_worker())

    # Startup: Pre-warm LibreOffice and font caches in background thread
    try:
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, _prewarm_engines)
    except Exception as e:
        logger.debug(f"Could not dispatch engine pre-warm: {e}")

    yield

    # Shutdown: Stop cleanup and keepalive workers
    cleanup_service.stop_worker()
    cleanup_task.cancel()
    keepalive_task.cancel()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise-grade, modular, secure PDF processing engine with 15-min ephemeral document retention.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Rate Limiting & Access Logging Middleware
@app.middleware("http")
async def security_and_timing_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Fast-path for Render container port detection probe (HEAD /)
    if request.method == "HEAD":
        return Response(status_code=200)

    # Rate limiting check for processing routes
    rate_limited_prefixes = (
        "/api/v1/jobs",
        "/api/v1/analyze",
        "/api/v1/qr-shares",
        "/api/v1/convert",
        "/convert",
        "/api/v1/handwriting",
    )
    if request.url.path.startswith(rate_limited_prefixes):
        if not rate_limiter.check_rate_limit(client_ip):
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Too many requests. Please slow down and try again.",
                        "suggestion": "Wait 60 seconds before submitting further jobs."
                    }
                }
            )

    start_time = time.time()
    response = await call_next(request)
    process_time = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(process_time)
    response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    return response


# Register Exception Handlers
app.add_exception_handler(PDFProcessingException, pdf_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

from backend.app.api.v1.convert import router as direct_convert_router

# Include Routers
app.include_router(root_health_router)
app.include_router(api_v1_router)
app.include_router(direct_convert_router)


@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }


@app.head("/")
def head_root():
    return Response(status_code=200)


@app.head("/health")
def head_health():
    return Response(status_code=200)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
