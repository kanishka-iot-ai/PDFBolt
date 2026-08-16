# Production-Grade PDF Processing Backend Dockerfile
FROM python:3.11-slim

# Install system dependencies including Tesseract OCR & fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    tesseract-ocr \
    tesseract-ocr-eng \
    libmagic1 \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Create non-root worker user for security
RUN groupadd -r pdfbolt && useradd -r -g pdfbolt -s /bin/false pdfbolt

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY . .

# Create and set permissions on storage directory
RUN mkdir -p /app/storage/jobs && \
    chown -R pdfbolt:pdfbolt /app

# Switch to non-root user
USER pdfbolt

EXPOSE 8000

ENV APP_ENV=production \
    PORT=8000 \
    HOST=0.0.0.0 \
    PYTHONUNBUFFERED=1

CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 4"]
