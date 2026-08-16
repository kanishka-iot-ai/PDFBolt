# PDFBolt Production Deployment Guide

## 1. Production Architecture Overview

PDFBolt is engineered as a decoupled, multi-tier document transformation platform:

```
                    USER
                      │
                      ▼
              https://pdfbolt.com
                      │
                      ▼
                  FRONTEND (Static CDN / Nginx)
                      │
             ┌────────┴────────┐
             ▼                 ▼
       CLIENT-SIDE       Render FastAPI API (/api/v1)
       PDF PROCESSING          │
                               ▼
                        Google Cloud Pub/Sub
                               │
                               ▼
                       Cloud Run Worker Pool
                               │
                               ▼
                     Private Google Cloud Storage (GCS)
                               │
                               ▼
                      Signed Temporary URL (15m TTL)
```

---

## 2. Backend API Deployment (Render)

The FastAPI backend API is configured for deployment on **Render**:

1. Connect your GitHub repository to Render.
2. Select **New Blueprint Instance** and reference `render.yaml`.
3. Configure the environment variables in Render Dashboard:
   - `STORAGE_BACKEND=gcs`
   - `GCS_PROJECT_ID=your-gcp-project-id`
   - `GCS_BUCKET_NAME=your-private-gcs-bucket`
   - `GCS_REGION=us-central1`
   - `PUBSUB_TOPIC_JOBS=pdfbolt-jobs`
   - `CORS_ORIGINS=["https://pdfbolt.com","https://www.pdfbolt.com","https://pdfbolt.in"]`
4. The service will automatically build and start using:
   ```bash
   uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT --workers 2
   ```

---

## 3. Heavy Worker Pool (Google Cloud Run & Cloud Build)

To build and deploy the containerized worker pool:

```bash
# Submit build via Cloud Build
gcloud builds submit --config=cloudbuild.yaml
```

The worker image contains:
- `tesseract-ocr` for optical character recognition
- `libreoffice` for high-fidelity office conversions
- `qpdf` for structural normalization & encryption
- `ghostscript` for rasterization and vector rendering

---

## 4. Google Cloud Storage & Pub/Sub Setup

1. **Create GCS Bucket**:
   ```bash
   gcloud storage buckets create gs://pdfbolt-documents --location=us-central1 --uniform-bucket-level-access
   ```
2. **Create Pub/Sub Topic & Subscription**:
   ```bash
   gcloud pubsub topics create pdfbolt-jobs
   gcloud pubsub subscriptions create pdfbolt-jobs-sub --topic=pdfbolt-jobs
   ```
3. **Application Default Credentials (ADC)**:
   Grant the Cloud Run service identity `roles/storage.objectAdmin` and `roles/pubsub.publisher`.

---

## 5. Domain & 301 Migration Setup

To preserve existing search rankings and consolidate authority from `pdfbolt.in` to `pdfbolt.com`:

1. **DNS Configuration**:
   - `pdfbolt.com` → CNAME / A records to Static CDN / Reverse Proxy.
   - `pdfbolt.in` → CNAME / A records to Nginx edge server.
2. **1-Hop Permanent 301 Redirect**:
   Configured in `nginx.conf`:
   ```nginx
   server {
       listen 80;
       server_name pdfbolt.in www.pdfbolt.in;
       return 301 https://pdfbolt.com$request_uri;
   }
   ```

---

## 6. Local Development Quickstart

### Step 1: Start Backend Engine
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Docs: `http://localhost:8000/docs`

### Step 2: Start Frontend Application
```bash
npm install
npm run dev
```
Frontend UI: `http://localhost:5173`
