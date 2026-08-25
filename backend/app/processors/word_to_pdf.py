import os
import subprocess
from pathlib import Path
from backend.app.core.errors import PDFBoltError
from backend.app.processors.base import BaseProcessor
from backend.app.core.logging import logger


class WordToPdfProcessor(BaseProcessor):
    operation = "word-to-pdf"
    input_formats = [".docx", ".doc"]
    output_format = ".pdf"

    def process(self, input_files, options=None):
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")
        input_path = Path(input_files[0])
        output_dir = Path(self.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_pdf = output_dir / f"{self.job_id}.pdf"

        try:
            # Use LibreOffice headless conversion for best fidelity
            cmd = [
                "soffice",
                "--headless",
                "--convert-to",
                "pdf:writer_pdf_Export",
                "--outdir",
                str(output_dir),
                str(input_path)
            ]
            subprocess.run(cmd, check=True, timeout=180)
            generated = output_dir / (input_path.stem + ".pdf")
            if generated.exists():
                # Move to canonical name
                if generated.resolve() != output_pdf.resolve():
                    try:
                        os.replace(str(generated), str(output_pdf))
                    except Exception:
                        # Fallback to copy
                        import shutil
                        shutil.copy(str(generated), str(output_pdf))
            if not output_pdf.exists() or output_pdf.stat().st_size == 0:
                raise PDFBoltError("CONVERSION_FAILED", "LibreOffice produced no output PDF")

            return output_pdf
        except subprocess.CalledProcessError as e:
            logger.error(f"LibreOffice conversion failed: {e}")
            raise PDFBoltError("CONVERSION_FAILED", str(e))
        except subprocess.TimeoutExpired:
            raise PDFBoltError("CONVERSION_TIMEOUT", "LibreOffice conversion timed out")
        except Exception as e:
            raise PDFBoltError("CONVERSION_FAILED", str(e))


WordToPdfProcessor = WordToPdfProcessor
