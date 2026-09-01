from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch periodic 15-min and 20-min temporary file auto-cleanup worker
    cleanup_task = asyncio.create_task(cleanup_service.start_periodic_worker(job_manager))
    yield
    # Shutdown: Stop cleanup worker
    cleanup_service.stop_worker()
    cleanup_task.cancel()


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


@app.get("/")
def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
