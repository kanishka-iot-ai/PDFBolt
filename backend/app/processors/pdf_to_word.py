from pathlib import Path
from typing import List, Dict, Any
from docx import Document
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_docx_output
from backend.app.core.logging import logger


class PdfToWordProcessor(BaseProcessor):
    operation = "pdf-to-word"
    input_formats = [".pdf"]
    output_format = ".docx"

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self._process_bytes_generic(input_files, str(options or "doc.pdf"))
        opts = options or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")


        input_pdf = input_files[0]
        output_path = self.output_dir / f"{self.job_id}.docx"
        converted = False

        # 1. Try pdf2docx for layout-aware conversion
        try:
            from pdf2docx import Converter
            cv = Converter(str(input_pdf))
            cv.convert(str(output_path), start=0, end=None)
            cv.close()
            if output_path.exists() and output_path.stat().st_size > 100:
                converted = True
        except Exception as e:
            logger.info(f"pdf2docx conversion failed or uninstalled, trying text fallback: {e}")

        # 2. Robust fallback using pdfplumber / pypdf + python-docx
        if not converted:
            try:
                import pdfplumber
                doc = Document()
                has_any_text = False

                with pdfplumber.open(str(input_pdf)) as pdf:
                    for p_idx, page in enumerate(pdf.pages):
                        text = page.extract_text()
                        if text and text.strip():
                            has_any_text = True
                            p = doc.add_paragraph()
                            p.add_run(text)
                        else:
                            # Try to extract words or add page placeholder
                            doc.add_paragraph(f"[Page {p_idx + 1}]")

                if not has_any_text:
                    # Try pypdf
                    from pypdf import PdfReader
                    reader = PdfReader(str(input_pdf), strict=False)
                    for p_idx, page in enumerate(reader.pages):
                        txt = page.extract_text()
                        if txt and txt.strip():
                            doc.add_paragraph(txt)
                        else:
                            doc.add_paragraph(f"[Page {p_idx + 1}] Document text was image-based or empty.")

                doc.save(str(output_path))
                converted = True
            except Exception as e:
                logger.error(f"Fallback docx generation failed: {e}")

        if not output_path.exists() or output_path.stat().st_size < 100:
            raise OutputValidationError("Failed to generate valid DOCX output document.")

        validate_docx_output(output_path)
        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        temp_in = self.temp_dir / "in.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)
        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        return out_bytes, "converted_document.docx", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "format": "docx",
            "quality_status": "passed"
        }


PDFToWordProcessor = PdfToWordProcessor

