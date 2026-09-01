import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict

from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.processors.base import BaseProcessor
from backend.app.core.logging import logger


class WordToPdfProcessor(BaseProcessor):
    """
    Direct Word (.docx/.doc) -> PDF Conversion Engine using LibreOffice.
    Executes headless LibreOffice conversion to generate pixel-perfect, native PDFs.
    """

    operation = "word-to-pdf"
    input_formats = [".docx", ".doc"]
    output_format = ".pdf"

    def _find_libreoffice(self) -> str:
        for bin_name in ["libreoffice", "soffice", "libreoffice.exe", "soffice.exe"]:
            p = shutil.which(bin_name)
            if p:
                return p
        # Check standard Windows paths if on Windows
        win_paths = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files\LibreOffice\program\libreoffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\libreoffice.exe",
        ]
        for wp in win_paths:
            if os.path.exists(wp):
                return wp
        return "libreoffice"

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "doc.docx"))

        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED", "No input Word document provided for conversion.")

        input_path = Path(input_files[0])
        if not input_path.exists():
            raise PDFBoltError("FILE_NOT_FOUND", f"Input Word document not found: {input_path}")

        output_dir = Path(self.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_pdf = output_dir / f"{self.job_id}.pdf"

        libreoffice_bin = self._find_libreoffice()

        # Command matching exact Colab specification: libreoffice --headless --convert-to pdf "{word_filename}" --outdir "{outdir}"
        cmd = [
            libreoffice_bin,
            "--headless",
            "--convert-to",
            "pdf",
            str(input_path),
            "--outdir",
            str(output_dir)
        ]

        try:
            logger.info(f"Converting '{input_path}' to PDF with LibreOffice: {' '.join(cmd)}")
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

            # LibreOffice outputs to '{stem}.pdf' in the outdir
            generated_pdf = output_dir / f"{input_path.stem}.pdf"
            if generated_pdf.exists() and generated_pdf.stat().st_size > 0:
                if generated_pdf.resolve() != output_pdf.resolve():
                    try:
                        os.replace(str(generated_pdf), str(output_pdf))
                    except Exception:
                        shutil.copy(str(generated_pdf), str(output_pdf))
                logger.info(f"Conversion successful! PDF saved as '{output_pdf}'")
            else:
                if not output_pdf.exists() or output_pdf.stat().st_size == 0:
                    logger.error(f"LibreOffice command executed, but output PDF not found. Stderr: {res.stderr}")
                    raise PDFBoltError("CONVERSION_FAILED", f"LibreOffice conversion failed: {res.stderr or 'No output generated'}")

        except subprocess.TimeoutExpired:
            raise PDFBoltError("CONVERSION_TIMEOUT", "Word to PDF conversion timed out.")
        except Exception as e:
            if isinstance(e, PDFBoltError):
                raise
            logger.error(f"Error during Word to PDF conversion: {e}")
            raise PDFBoltError("CONVERSION_FAILED", f"Please ensure LibreOffice is installed and the Word document is valid: {e}")

        if not output_pdf.exists() or output_pdf.stat().st_size == 0:
            raise OutputValidationError("Failed to generate a valid PDF document from Word file.")

        self.metrics = {
            "format": "pdf",
            "quality_status": "passed",
            "quality_score": 100,
            "status": "success"
        }

        return output_pdf

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        ext = os.path.splitext(filename)[1] or ".docx"
        temp_in = self.temp_dir / f"in{ext}"
        with open(temp_in, "wb") as f:
            f.write(content)

        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        metrics = {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "format": "pdf",
            "quality_status": "passed",
            "quality_score": 100
        }

        return out_bytes, "converted_document.pdf", metrics


WordToPdfProcessor = WordToPdfProcessor
