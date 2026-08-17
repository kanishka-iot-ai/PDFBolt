# PDFBolt REST API Specification (v1)

Base URL: `https://pdfbolt-api.onrender.com/api/v1`

---

## Endpoints

### 1. Document Analysis (`POST /api/v1/analyze`)
Extracts structural metrics, topics, and returns an adaptive profile recommendation.

**Request:** `multipart/form-data`
- `file`: PDF file binary

**Response (`200 OK`):**
```json
{
  "success": true,
  "filename": "annual_report.pdf",
  "size_bytes": 19314728,
  "page_count": 86,
  "pdf_version": "%PDF-1.7",
  "is_encrypted": false,
  "text_present": true,
  "image_count": 142,
  "font_count": 8,
  "table_count": 3,
  "reading_time_minutes": 14,
  "detected_type": "image-heavy",
  "recommended_profile": "balanced",
  "expected_reduction": "55%-75%",
  "optimization_potential": "high",
  "recommendation_reason": "This PDF contains high-resolution embedded images. Balanced downsampling will save significant space.",
  "summary": "Analyzed 86 page document containing 142 images and approximately 2800 words.",
  "topics": ["#Financial", "#Revenue", "#Performance", "#Growth"]
}
```

---

### 2. Submit Document Job (`POST /api/v1/jobs`)
Creates and executes a document processing task.

**Request:** `multipart/form-data`
- `operation`: String (`compress`, `merge`, `split`, `rotate`, `delete_pages`, `watermark`, `page_number`, `protect`, `unlock`, `pdf_to_word`, `pdf_to_excel`, `pdf_to_ppt`, `pdf_to_image`, `image_to_pdf`)
- `settings`: JSON string (e.g. `{"profile": "balanced"}`)
- `file`: Single binary file
- `files`: Multiple binary files (for `merge`)

**Response (`200 OK`):**
```json
{
  "job_id": "4a72d3f1-28cf-45e6-953b-e3c79a29e46a",
  "operation": "compress",
  "status": "COMPLETED",
  "progress": 100,
  "created_at": "2026-08-16T14:48:00Z",
  "started_at": "2026-08-16T14:48:01Z",
  "completed_at": "2026-08-16T14:48:02Z",
  "input": {
    "filename": "annual_report.pdf",
    "size_bytes": 19314728
  },
  "output": {
    "filename": "annual_report_compressed.pdf",
    "size_bytes": 6810000
  },
  "metrics": {
    "original_size_bytes": 19314728,
    "output_size_bytes": 6810000,
    "saved_bytes": 12504728,
    "reduction_percent": 64.74,
    "is_reduced": true,
    "quality_status": "excellent"
  },
  "quality": {
    "status": "passed",
    "score": 1.0,
    "notes": ["Integrity and structural validation passed."]
  },
  "download_url": "/api/v1/jobs/4a72d3f1-28cf-45e6-953b-e3c79a29e46a/download"
}
```

---

### 3. Download Result (`GET /api/v1/jobs/{job_id}/download`)
Downloads the verified output file artifact.

---

### 4. Health Probes (`GET /health`, `GET /ready`, `GET /version`)
Returns system status, version, and storage health.
