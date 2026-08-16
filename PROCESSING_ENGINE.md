# PDFBolt Processing Engine Deep-Dive & Licensing

## 1. Engine Rationale & Dependency Choices

PDFBolt balances correctness, speed, and license compliance:

| Engine | Purpose | License | Rationale |
|---|---|---|---|
| **`pypdf` (4.x+)** | PDF manipulation, page merging, stream deflation, encryption | BSD-3-Clause | Permissive, zero external C runtime requirements, stable object stream support. |
| **`pymupdf` (FitZ)** | High-speed rendering & raster extraction | Dual (AGPL / Commercial) | Used conditionally for page-to-image rasterization. |
| **`python-docx`** | PDF → Word layout conversion | MIT | Permissive, native OpenXML `.docx` XML serialization. |
| **`openpyxl`** | PDF → Excel data table conversion | MIT | Permissive, native OpenXML `.xlsx` serialization. |
| **`python-pptx`** | PDF → PowerPoint presentation generation | MIT | Permissive, native `.pptx` slide vector generation. |
| **`Pillow`** | Image quality, JPEG downsampling, DPI optimization | HPND | Industry standard image processing. |
| **`reportlab`** | Vector overlays, page numbering, dynamic watermarks | BSD | Standard PDF vector drawing engine. |

---

## 2. The Adaptive Compression Architecture

### Compression Profiles:
1. **MAXIMUM_QUALITY**: 300 DPI, 92% JPEG quality, Deflate streams (ideal for print & archival).
2. **HIGH_QUALITY**: 200 DPI, 85% JPEG quality (ideal for business reports).
3. **BALANCED**: 150 DPI, 75% JPEG quality (recommended for general use).
4. **HIGH_COMPRESSION**: 100 DPI, 58% JPEG quality (ideal for email attachments).
5. **EXTREME_COMPRESSION**: 72 DPI, 42% JPEG quality (for strict portal limits <2MB).
6. **CUSTOM**: User-defined DPI and JPEG quality parameters.

### 🛡️ The Regression Trap (Zero Falsified Savings)
```python
# Exact acceptance logic implemented in backend/app/processors/compress.py
if output_size >= original_size:
    metrics = {
        "original_size_bytes": original_size,
        "output_size_bytes": original_size,
        "saved_bytes": 0,
        "reduction_percent": 0.0,
        "is_reduced": False,
        "quality_status": "preserved_original",
        "notice": "No size reduction achieved. Your original file has been preserved."
    }
    return original_bytes, filename, metrics
```
If an already-optimized document (e.g. `75.72 KB`) cannot be compressed further, the system **rejects the bloated output**, returns the original file, and reports exact raw byte metrics.
