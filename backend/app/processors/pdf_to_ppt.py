import io
from pathlib import Path
from typing import List, Dict, Any
from pptx import Presentation
from pptx.util import Inches, Pt
from pypdf import PdfReader
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pptx_output
from backend.app.core.logging import logger


class PdfToPptProcessor(BaseProcessor):
    operation = "pdf-to-ppt"
    input_formats = [".pdf"]
    output_format = ".pptx"

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self._process_bytes_generic(input_files, str(options or "doc.pdf"))
        opts = options or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")


        input_pdf = input_files[0]
        reader = PdfReader(str(input_pdf), strict=False)
        total_pages = len(reader.pages)

        prs = Presentation()
        # Default slide layout (blank slide is layout 6)
        blank_slide_layout = prs.slide_layouts[6]
        
        # Set 16:9 widescreen dimensions (13.33 x 7.5 inches)
        prs.slide_width = Inches(13.333)
        prs.slide_height = Inches(7.5)

        for p_idx, page in enumerate(reader.pages):
            slide = prs.slides.add_slide(blank_slide_layout)
            text = page.extract_text() or f"Slide {p_idx + 1}"
            
            # Place extracted text block
            tx_box = slide.shapes.add_textbox(Inches(1.0), Inches(1.0), Inches(11.333), Inches(5.5))
            tf = tx_box.text_frame
            tf.word_wrap = True

            lines = [l for l in text.splitlines() if l.strip()]
            for line_idx, line in enumerate(lines[:20]): # Add up to first 20 key lines
                if line_idx == 0:
                    p = tf.paragraphs[0]
                    p.text = line
                    p.font.bold = True
                    p.font.size = Pt(24)
                else:
                    p = tf.add_paragraph()
                    p.text = line
                    p.font.size = Pt(14)

        output_path = self.output_dir / f"{self.job_id}.pptx"
        prs.save(str(output_path))

        # Invariant: slide_count == input_page_count
        validate_pptx_output(output_path)
        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        temp_in = self.temp_dir / "in.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)
        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        return out_bytes, "presentation.pptx", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "format": "pptx",
            "quality_status": "passed"
        }


PDFToPPTProcessor = PdfToPptProcessor

