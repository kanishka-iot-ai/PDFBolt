# PDFBolt Security Architecture & Threat Model

PDFBolt treats **every uploaded document as untrusted input**.

---

## 1. Threat Mitigation Matrix

| Threat Vector | Mitigation Strategy | Implemented In |
|---|---|---|
| **Extension Spoofing & Polyglot Files** | Header binary magic-byte sniffing (`%PDF-`, `PK\x03\x04`, `\xFF\xD8\xFF`, `\x89PNG`). Files with invalid magic bytes are rejected at the edge. | `backend/app/validators/input_validator.py` |
| **Path Traversal Attacks (`../../etc/passwd`)** | Strict sanitization removing null bytes (`\x00`), control characters, directory separators, consecutive dots, and Windows reserved names (`CON`, `PRN`). | `backend/app/core/security.py` |
| **Zip Bombs / RAM Exhaustion** | Strict file size limit (100 MB max) and maximum page count (1,000 pages). Streaming chunk validation. | `backend/app/validators/input_validator.py` |
| **Container Privilege Escalation** | Docker container executes under dedicated unprivileged non-root user `pdfbolt`. | `backend/Dockerfile` |
| **Denial of Service (DoS)** | In-memory token bucket rate limiter (60 requests/minute per client IP). | `backend/app/core/security.py` |
| **Data Leakage & Logging** | Structured JSON logs capture `job_id`, byte sizes, and duration. Document text contents are **never written to logs**. | `backend/app/core/logging.py` |
| **Stack Trace Disclosure** | Global exception handlers intercept raw tracebacks and return sanitized error schemas with human guidance. | `backend/app/core/errors.py` |

---

## 2. Storage Directory Isolation

User files are strictly stored under isolated UUID paths:
```
/storage/jobs/{uuid4}/input/
/storage/jobs/{uuid4}/output/
```
No user-controlled parameter can dictate the output destination on the filesystem.
