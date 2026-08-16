from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "PDFBolt Processing Engine"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS (Strict production origins; no wildcard *)
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://pdfbolt.com",
        "https://www.pdfbolt.com",
        "https://pdfbolt.in"
    ]

    # File & Security Limits
    MAX_UPLOAD_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB
    MAX_PAGE_LIMIT: int = 1000
    MAX_EXECUTION_TIMEOUT_SECONDS: int = 120
    RATE_LIMIT_PER_MINUTE: int = 60

    # Storage & Temporary Document Retention Policy
    STORAGE_BACKEND: str = "local"  # 'local' or 'gcs'
    LOCAL_STORAGE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage"))
    
    # Google Cloud Storage (GCS) Configuration
    GCS_PROJECT_ID: str = ""
    GCS_BUCKET_NAME: str = "pdfbolt-documents"
    GCS_REGION: str = "us-central1"
    
    # Google Cloud Pub/Sub Queue Configuration
    PUBSUB_TOPIC_JOBS: str = "pdfbolt-jobs"
    PUBSUB_SUBSCRIPTION_JOBS: str = "pdfbolt-jobs-sub"

    # Strict 15-Minute Processing TTL & 20-Minute Hard Safety Limit
    PROCESSING_FILE_TTL_SECONDS: int = 900       # 15 Minutes standard TTL
    HARD_SAFETY_TTL_SECONDS: int = 1200          # 20 Minutes emergency purge limit
    CLEANUP_INTERVAL_SECONDS: int = 300          # Background worker cycle (5 Minutes)
    SIGNED_URL_TTL_SECONDS: int = 900            # Short-lived signed download URL (15 Minutes)
    QR_SHARE_RETENTION_SECONDS: int = 30 * 86400 # 30 Days (Separate policy for intentional QR sharing)

    # AI Handwriting & Vision Settings
    AI_PROVIDER: str = "local"  # 'local', 'gemini', 'openai', 'anthropic', 'fallback'
    AI_API_KEY: str = ""
    AI_API_ENDPOINT: str = ""
    AI_MODEL: str = "gemini-1.5-flash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
