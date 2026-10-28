# 🚀 PDFBolt Partner API & Integration Guide

Welcome to the **PDFBolt Partner Engine API**. This guide enables B2B partners, external developers, microservices, and client platforms to collaborate and securely process PDF documents using PDFBolt's high-performance engine.

---

## 1. Authentication

All external programmatic API calls require authentication via an authorized partner API key.

### Supported Headers
You can supply your key in either of two standard HTTP headers:

1. **`X-API-Key`** (Recommended for scripts & backend microservices):
   ```http
   X-API-Key: pdfbolt_live_your_partner_key
   ```
2. **`Authorization: Bearer`** (RFC 6750 standard):
   ```http
   Authorization: Bearer pdfbolt_live_your_partner_key
   ```

> **Security Note:** Keys are verified using constant-time comparison (`secrets.compare_digest`) against SHA-256 pre-computed digests, eliminating side-channel timing attacks.

---

## 2. Base URLs

| Environment | Base URL |
| :--- | :--- |
| **Production API** | `https://pdfbolt-api.onrender.com` |
| **Local Development** | `http://localhost:8000` |

---

## 3. Generating a Partner Key (Admin)

Admins can issue cryptographically secure partner keys using the CLI generator:

```bash
python backend/scripts/generate_partner_key.py --partner "AcmeCorp" --tier "enterprise" --limit 300
```

This outputs:
* `partner_id`: e.g., `acmecorp`
* `api_key`: e.g., `pdfbolt_live_acmecorp_V63u7n...`
* Ready-to-use configuration for `backend/.env` or Render environment variables.

---

## 4. Core Endpoints

### A. Universal Document Processing (`POST /api/v1/jobs`)
Execute any document operation through PDFBolt's 20-step verification pipeline.

#### Supported Operations
* `compress`: Advanced target compression (`profile`: `"target_size"` with `target_kb`, or preset profiles `"smart"`, `"high"`, `"extreme"`).
* `grayscale`: Convert color PDF to black & white / grayscale with 600 DPI rendering.
* `merge`: Merge multiple PDF documents into one.
* `split`: Split or extract specific pages.
* `rotate`: Rotate pages by 90, 180, or 270 degrees.
* `watermark`: Stamp text watermark across document pages.
* `page_number`: Professional header/footer pagination.
* `protect`: Encrypt PDF with user/owner password.
* `unlock`: Decrypt password-protected PDF.
* `repair`: Repair broken or corrupted PDF structures.
* `ocr`: Extract text from scanned raster documents.

#### Request Example (cURL - Target 50KB Compression)
```bash
curl -X POST "https://pdfbolt-api.onrender.com/api/v1/jobs" \
  -H "X-API-Key: pdfbolt_live_your_key" \
  -F "operation=compress" \
  -F "settings={\"profile\": \"target_size\", \"target_kb\": 50}" \
  -F "file=@/path/to/document.pdf"
```

#### Request Example (Python `requests`)
```python
import requests

url = "https://pdfbolt-api.onrender.com/api/v1/jobs"
headers = {"X-API-Key": "pdfbolt_live_your_key"}

files = {"file": open("document.pdf", "rb")}
data = {
    "operation": "compress",
    "settings": '{"profile": "target_size", "target_kb": 100}'
}

response = requests.post(url, headers=headers, files=files, data=data)
result = response.json()

print("Status:", result["status"])
print("Download URL:", result["download_url"])
```

#### Request Example (Node.js / TypeScript `fetch`)
```typescript
import fs from 'fs';

async function processDocument() {
  const formData = new FormData();
  formData.append('operation', 'compress');
  formData.append('settings', JSON.stringify({ profile: 'balanced' }));
  formData.append('file', new Blob([fs.readFileSync('document.pdf')]), 'document.pdf');

  const res = await fetch('https://pdfbolt-api.onrender.com/api/v1/jobs', {
    method: 'POST',
    headers: {
      'X-API-Key': 'pdfbolt_live_your_key'
    },
    body: formData
  });

  const data = await res.json();
  console.log('Result:', data);
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "job_id": "c1f7a0b3-90d1-4e78-9e5c-0b81df8e27c1",
  "status": "COMPLETED",
  "operation": "compress",
  "poll_url": "/api/v1/jobs/c1f7a0b3-90d1-4e78-9e5c-0b81df8e27c1",
  "download_url": "/api/v1/jobs/c1f7a0b3-90d1-4e78-9e5c-0b81df8e27c1/download?token=8c4e...d2",
  "output": {
    "filename": "document_compressed.pdf",
    "size_bytes": 48120
  },
  "metrics": {
    "original_size_bytes": 285400,
    "output_size_bytes": 48120,
    "saved_bytes": 237280,
    "reduction_percent": 83.1,
    "is_reduced": true,
    "quality_status": "passed",
    "partner_id": "acmecorp",
    "tier": "enterprise"
  },
  "created_at": "2026-10-28T04:30:00Z",
  "expires_at": "2026-10-28T04:45:00Z"
}
```

---

### B. Document Downloading (`GET /api/v1/jobs/{job_id}/download`)
The download URL provided in the job response includes a secure one-time token and is valid for **15 minutes**:

```bash
curl -O "https://pdfbolt-api.onrender.com/api/v1/jobs/{job_id}/download?token={token}"
```

---

### C. Direct Conversions (`POST /convert/word-to-pdf` & `pdf-to-word`)
High-fidelity Microsoft Office conversions with Gotenberg and LibreOffice fallback:

```bash
curl -X POST "https://pdfbolt-api.onrender.com/convert/word-to-pdf" \
  -H "X-API-Key: pdfbolt_live_your_key" \
  -F "file=@contract.docx" \
  --output contract.pdf
```

---

### D. Structural Inspection (`POST /api/v1/analyze`)
Inspect page count, dimensions, embedded fonts, image resolution, and security metadata without executing modifications:

```bash
curl -X POST "https://pdfbolt-api.onrender.com/api/v1/analyze" \
  -H "X-API-Key: pdfbolt_live_your_key" \
  -F "file=@sample.pdf"
```

---

## 5. Rate Limits & Quotas

| Tier | Rate Limit | Max Upload Size | Concurrent Workers |
| :--- | :--- | :--- | :--- |
| **Public / Web** | 60 requests / min | 100 MB | 2 |
| **Standard Partner** | 120 requests / min | 100 MB | 4 |
| **Pro Partner** | 300 requests / min | 100 MB | 8 |
| **Enterprise** | Custom (up to 1,000 / min) | Custom | Dedicated Pool |

If rate limited, the API returns HTTP `429 Too Many Requests` with a `Retry-After` suggestion.

---

## 6. Error Handling

All error responses return structured JSON:

```json
{
  "detail": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or inactive.",
    "suggestion": "Check your X-API-Key or Authorization: Bearer <key> header."
  }
}
```

### Common Error Codes
* `401 Unauthorized` (`MISSING_API_KEY` / `API_KEY_REQUIRED`): Key omitted on external call.
* `401 Unauthorized` (`INVALID_API_KEY`): Invalid or revoked key.
* `400 Bad Request` (`FILE_TOO_LARGE`): File exceeds 100 MB limit.
* `400 Bad Request` (`UNSUPPORTED_FORMAT`): File is not a valid PDF or supported document format.
* `429 Too Many Requests` (`RATE_LIMITED`): Request quota exceeded for the current 60-second window.
