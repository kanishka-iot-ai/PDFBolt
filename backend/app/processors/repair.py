import io
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
from pypdf import PdfReader, PdfWriter

try:
    import pymupdf
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import logger


class RepairProcessor(BaseProcessor):
    operation = "repair"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def _binary_clean(self, raw_bytes: bytes) -> bytes:
        """Strips leading corrupted bytes/BOM and ensures valid %PDF- header and %%EOF trailer."""
        pdf_idx = raw_bytes.find(b"%PDF-")
        cleaned = raw_bytes[pdf_idx:] if pdf_idx != -1 else raw_bytes
        if not cleaned.rstrip().endswith(b"%%EOF"):
            cleaned = cleaned + b"\n%%EOF\n"
        return cleaned

    def _repair_pymupdf(self, raw_bytes: bytes, output_path: Path) -> bool:
        if not HAS_PYMUPDF:
            return False
        try:
            cleaned = self._binary_clean(raw_bytes)
            doc = pymupdf.open(stream=cleaned, filetype="pdf")
            if len(doc) > 0:
                doc.save(str(output_path), garbage=4, clean=True, deflate=True)
                doc.close()
                return output_path.exists() and output_path.stat().st_size > 100
            doc.close()
        except Exception as e:
            logger.info(f"PyMuPDF repair attempt failed: {e}")
        return False

    def _repair_ghostscript(self, input_pdf: Path, output_path: Path) -> bool:
        for bin_name in ["gs", "gswin64c", "gswin32c", "ghostscript"]:
            gs_bin = shutil.which(bin_name)
            if gs_bin:
                try:
                    cmd = [
                        gs_bin,
                        "-sDEVICE=pdfwrite",
                        "-dCompatibilityLevel=1.4",
                        "-dPDFSETTINGS=/default",
                        "-dNOPAUSE",
                        "-dBATCH",
                        "-dSAFER",
                        "-dQUIET",
                        f"-sOutputFile={str(output_path)}",
                        str(input_pdf)
                    ]
                    res = subprocess.run(cmd, capture_output=True, timeout=60)
                    if res.returncode == 0 and output_path.exists() and output_path.stat().st_size > 100:
                        return True
                except Exception as e:
                    logger.info(f"Ghostscript repair attempt failed: {e}")
        return False

    def _repair_pypdf(self, raw_bytes: bytes, output_path: Path) -> bool:
        try:
            cleaned = self._binary_clean(raw_bytes)
            reader = PdfReader(io.BytesIO(cleaned), strict=False)
            if len(reader.pages) > 0:
                writer = PdfWriter()
                for page in reader.pages:
                    writer.add_page(page)
                with open(output_path, "wb") as f:
                    writer.write(f)
                return output_path.exists() and output_path.stat().st_size > 100
        except Exception as e:
            logger.info(f"PyPDF repair attempt failed: {e}")
        return False

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "doc.pdf"))
        opts = options or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        output_path = self.output_dir / f"{self.job_id}.pdf"
        repaired = False

        with open(input_pdf, "rb") as f:
            raw_bytes = f.read()

        # Level 1: PyMuPDF structural & XRef repair
        repaired = self._repair_pymupdf(raw_bytes, output_path)

        # Level 2: Ghostscript PDF-Write rebuild
        if not repaired:
            repaired = self._repair_ghostscript(input_pdf, output_path)

        # Level 3: PyPDF fault-tolerant page extractor
        if not repaired:
            repaired = self._repair_pypdf(raw_bytes, output_path)

        if not repaired or not output_path.exists() or output_path.stat().st_size < 100:
            raise PDFBoltError("CORRUPTED_PDF", "Unable to recover corrupted PDF file structure across all recovery tiers.")

        validate_pdf_output(output_path)
        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        temp_in = self.temp_dir / "in.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)

        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        return out_bytes, "repaired_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "format": "pdf",
            "quality_status": "passed"
        }

