from fastapi import APIRouter
from backend.app.api.v1.jobs import router as jobs_router
from backend.app.api.v1.analyze import router as analyze_router
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.devices import router as devices_router
from backend.app.api.v1.qr_shares import router as qr_shares_router
from backend.app.api.v1.handwriting import router as handwriting_router
from backend.app.api.v1.redact import router as redact_router
from backend.app.api.v1.convert import router as convert_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(analyze_router)
api_v1_router.include_router(jobs_router)
api_v1_router.include_router(devices_router)
api_v1_router.include_router(qr_shares_router)
api_v1_router.include_router(handwriting_router)
api_v1_router.include_router(redact_router)
api_v1_router.include_router(convert_router)
