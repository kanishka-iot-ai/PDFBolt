import os
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import logger


class CompressProcessor(BaseProcessor):
    operation = "compress"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def _find_ghostscript(self) -> Optional[str]:
        for bin_name in ["gs", "gswin64c", "gswin32c", "ghostscript"]:
            path = shutil.which(bin_name)
            if path:
                return path
        return None

    def _compress_ghostscript(self, input_path: Path, output_path: Path, level: str) -> bool:
        gs_bin = self._find_ghostscript()
        if not gs_bin:
            return False

        lvl = level.upper()
        if lvl == "LOW":
            pdf_setting = "/ebook"
            extra_args = []
        elif lvl == "MEDIUM":
            pdf_setting = "/printer"
            extra_args = []
        elif lvl == "EXTREME":
            pdf_setting = "/screen"
            extra_args = [
                "-dColorImageDownsampleType=/Bicubic",
                "-dColorImageResolution=60",
                "-dGrayImageDownsampleType=/Bicubic",
                "-dGrayImageResolution=60",
                "-dMonoImageDownsampleType=/Bicubic",
                "-dMonoImageResolution=60"
            ]
        else: # HIGH (default)
            pdf_setting = "/screen"
            extra_args = []

        cmd = [
            gs_bin,
            "-sDEVICE=pdfwrite",
            "-dCompatibilityLevel=1.4",
            f"-dPDFSETTINGS={pdf_setting}",
            "-dNOPAUSE",
            "-dBATCH",
            "-dSAFER",
            "-dQUIET",
            *extra_args,
            f"-sOutputFile={str(output_path)}",
            str(input_path)
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if res.returncode == 0 and output_path.exists() and output_path.stat().st_size > 0:
                return True
            else:
                logger.warning(f"Ghostscript compression exited code {res.returncode}: {res.stderr}")
                return False
        except Exception as e:
            logger.warning(f"Ghostscript compression failed: {e}")
            return False

    def _compress_python_fallback(self, input_path: Path, output_path: Path) -> None:
        reader = PdfReader(str(input_path), strict=False)
        writer = PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        for page in writer.pages:
            try:
                page.compress_content_streams()
            except Exception:
                pass
            try:
                for img in page.images:
                    try:
                        img.replace(img.image, quality=60)
                    except Exception:
                        pass
            except Exception:
                pass

        with open(output_path, "wb") as f:
            writer.write(f)


    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "doc.pdf"))
        opts = options or self.settings or {}

        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        input_size = input_pdf.stat().st_size
        reader = PdfReader(str(input_pdf), strict=False)
        expected_pages = len(reader.pages)

        level = opts.get("level") or opts.get("strength") or "HIGH"

        candidate_path = self.temp_dir / f"candidate_{self.job_id}.pdf"

        # 1. Try Ghostscript first
        gs_success = self._compress_ghostscript(input_pdf, candidate_path, str(level))
        if not gs_success or not candidate_path.exists() or candidate_path.stat().st_size == 0:
            # 2. Fallback to pure Python stream optimizer
            self._compress_python_fallback(input_pdf, candidate_path)

        output_path = self.output_dir / f"{self.job_id}.pdf"
        compressed_size = candidate_path.stat().st_size if candidate_path.exists() else input_size

        # Invariant: NEVER return a compressed file larger than the input
        if compressed_size >= input_size or not candidate_path.exists():
            shutil.copyfile(input_pdf, output_path)
            actual_pages = validate_pdf_output(output_path)
            self.settings["no_size_reduction"] = True
            return output_path

        shutil.copyfile(candidate_path, output_path)

        # Invariant: output_pages == input_pages
        actual_pages = validate_pdf_output(output_path)
        if actual_pages != expected_pages:
            output_path.unlink(missing_ok=True)
            raise OutputValidationError(f"Compression altered page count: expected {expected_pages}, got {actual_pages}.")

        return output_path

    # Backward-compatible byte processing
    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        import io
        temp_in = self.temp_dir / "in.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)

        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        is_reduced = len(out_bytes) < len(content)
        if is_reduced:
            saved = len(content) - len(out_bytes)
            pct = round((saved / len(content)) * 100, 2)
            out_size = len(out_bytes)
            final_bytes = out_bytes
        else:
            saved = 0
            pct = 0.0
            out_size = len(content)
            final_bytes = content

        return final_bytes, "compressed_document.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": out_size,
            "saved_bytes": saved,
            "reduction_percent": pct,
            "is_reduced": is_reduced,
            "quality_status": "passed"
        }

