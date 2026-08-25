FROM python:3.11-slim AS base
WORKDIR /app

# Install all required system binaries
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript \
    qpdf \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    libreoffice \
    imagemagick \
    libmagic1 \
    python3-opencv \
    fonts-liberation \
    fonts-dejavu \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Non-root user (security requirement)
RUN groupadd -r pdfbolt && \
    useradd -r -g pdfbolt -u 1001 pdfbolt && \
    mkdir -p /tmp/pdfbolt && \
    chown -R pdfbolt:pdfbolt /tmp/pdfbolt && \
    chown -R pdfbolt:pdfbolt /app

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=pdfbolt:pdfbolt . .

USER pdfbolt

ENV PYTHONUNBUFFERED=1
ENV TEMP_DIR=/tmp/pdfbolt
ENV STORAGE_BACKEND=local
ENV QUEUE_BACKEND=local
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
