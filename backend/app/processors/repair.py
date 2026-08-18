import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader, PdfWriter
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import logger


class RepairProcessor(BaseProcessor):
    operation = "repair"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        output_path = self.output_dir / f"{self.job_id}.pdf"
        repaired = False

        # Level 1: pypdf tolerant rebuild
        try:
            reader = PdfReader(str(input_pdf), strict=False)
            if len(reader.pages) > 0:
                writer = PdfWriter()
                for page in reader.pages:
                    writer.add_page(page)
                with open(output_path, "wb") as f:
                    writer.write(f)
                validate_pdf_output(output_path)
                repaired = True
        except Exception as e:
            logger.info(f"Level 1 (pypdf) repair attempt failed: {e}")

        # Level 2: pikepdf QPDF-backed structural repair
        if not repaired:
            try:
                import pikepdf
                with pikepdf.open(str(input_pdf), suppress_warnings=True) as pdf:
                    pdf.save(str(output_path))
                validate_pdf_output(output_path)
                repaired = True
            except Exception as e:
                logger.info(f"Level 2 (pikepdf) repair attempt failed: {e}")

        # Level 3: qpdf CLI subprocess repair
        if not repaired:
            qpdf_bin = shutil.which("qpdf")
            if qpdf_bin:
                try:
                    cmd = [qpdf_bin, "--linearize", str(input_pdf), str(output_path)]
                    res = subprocess.run(cmd, capture_output=True, timeout=60)
                    if res.returncode in [0, 3] and output_path.exists() and output_path.stat().st_size > 0:
                        validate_pdf_output(output_path)
                        repaired = True
                except Exception as e:
                    logger.info(f"Level 3 (qpdf) repair attempt failed: {e}")

        if not repaired or not output_path.exists() or output_path.stat().st_size == 0:
            raise PDFBoltError("CORRUPTED_PDF", "Unable to recover corrupted PDF file structure across all recovery tiers.")

        return output_path
