import io
from pathlib import Path
from typing import List, Dict, Any
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from PIL import Image

from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_docx_output
from backend.app.core.logging import logger


class PdfToWordProcessor(BaseProcessor):
    operation = "pdf-to-word"
    input_formats = [".pdf"]
    output_format = ".docx"

    def _convert_pdf2docx(self, input_pdf: Path, output_docx: Path) -> bool:
        """
        State-of-the-art layout-preserving conversion engine (pdf2docx).
        Preserves text margins, multicolumn alignment, tables, images, and fonts.
        """
        try:
            from pdf2docx import Converter
            cv = Converter(str(input_pdf))
            cv.convert(str(output_docx), start=0, end=None)
            cv.close()
            return output_docx.exists() and output_docx.stat().st_size > 200
        except Exception as e:
            logger.warning(f"pdf2docx primary engine error: {e}")
            return False

    def _convert_pymupdf_structured(self, input_pdf: Path, output_docx: Path) -> bool:
        """
        High-fidelity structured fallback using PyMuPDF and python-docx.
        Extracts blocks, font styles, alignments, and embeds all images into the Word document.
        """
        try:
            import pymupdf
            doc_pdf = pymupdf.open(str(input_pdf))
            doc_word = Document()

            for page_num, page in enumerate(doc_pdf):
                if page_num > 0:
                    doc_word.add_page_break()

                # 1. Extract and render structured text blocks
                text_page = page.get_text("dict")
                blocks = text_page.get("blocks", [])

                for block in blocks:
                    block_type = block.get("type", 0)
                    if block_type == 0:  # Text block
                        lines = block.get("lines", [])
                        p = doc_word.add_paragraph()
                        
                        for line in lines:
                            spans = line.get("spans", [])
                            for span in spans:
                                text = span.get("text", "")
                                if not text:
                                    continue
                                run = p.add_run(text)
                                # Preserve font properties
                                size = span.get("size")
                                if size and size > 0:
                                    run.font.size = Pt(min(36, max(7, round(size, 1))))
                                flags = span.get("flags", 0)
                                if flags & 2:  # Italic
                                    run.italic = True
                                if flags & 16 or flags & 4:  # Bold
                                    run.bold = True
                                color = span.get("color")
                                if color is not None and color > 0:
                                    # Convert int color (sRGB) to RGB
                                    r = (color >> 16) & 255
                                    g = (color >> 8) & 255
                                    b = color & 255
                                    run.font.color.rgb = RGBColor(r, g, b)
                    elif block_type == 1:  # Image block
                        img_bytes = block.get("image")
                        if img_bytes:
                            try:
                                img_stream = io.BytesIO(img_bytes)
                                doc_word.add_picture(img_stream, width=Inches(min(5.5, max(1.5, block.get("width", 300) / 72.0))))
                            except Exception:
                                pass

                # 2. Extract any standalone page images not captured in blocks
                try:
                    for img_info in page.get_images():
                        xref = img_info[0]
                        base_image = doc_pdf.extract_image(xref)
                        if base_image and base_image.get("image"):
                            raw_img = base_image["image"]
                            if len(raw_img) > 4096:  # Skip tiny masks
                                img_stream = io.BytesIO(raw_img)
                                try:
                                    doc_word.add_picture(img_stream, width=Inches(4.5))
                                except Exception:
                                    pass
                except Exception:
                    pass

            doc_pdf.close()
            doc_word.save(str(output_docx))
            return output_docx.exists() and output_docx.stat().st_size > 200
        except Exception as e:
            logger.warning(f"PyMuPDF structured Word fallback error: {e}")
            return False

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self._process_bytes_generic(input_files, str(options or "doc.pdf"))
        opts = options or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        output_path = self.output_dir / f"{self.job_id}.docx"
        converted = False

        # 1. Try pdf2docx for exact layout, tables, columns, and images
        converted = self._convert_pdf2docx(input_pdf, output_path)

        # 2. Try PyMuPDF structured block & image extraction
        if not converted:
            converted = self._convert_pymupdf_structured(input_pdf, output_path)

        # 3. Fallback to basic extraction
        if not converted:
            try:
                import pdfplumber
                doc = Document()
                with pdfplumber.open(str(input_pdf)) as pdf:
                    for p_idx, page in enumerate(pdf.pages):
                        text = page.extract_text()
                        if text and text.strip():
                            doc.add_paragraph(text)
                        else:
                            doc.add_paragraph(f"[Page {p_idx + 1}]")
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


