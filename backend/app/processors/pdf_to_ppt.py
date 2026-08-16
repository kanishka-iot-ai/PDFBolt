import io
from typing import Tuple, Dict, Any
import pypdf
from pptx import Presentation
from pptx.util import Inches, Pt
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFProcessingException, ErrorCode
from backend.app.validators.output_validator import OutputValidator


class PDFToPPTProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        page_count, is_enc = self.validate_input(content)
        if is_enc:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Cannot convert encrypted PDF to PowerPoint without password.",
                status_code=400
            )

        prs = Presentation()
        # Set 16:9 widescreen layout
        prs.slide_width = Inches(13.333)
        prs.slide_height = Inches(7.5)

        blank_slide_layout = prs.slide_layouts[6]
        reader = pypdf.PdfReader(io.BytesIO(content))

        for page_idx, page in enumerate(reader.pages):
            slide = prs.slides.add_slide(blank_slide_layout)
            text = page.extract_text() or ""
            lines = [l.strip() for l in text.split('\n') if l.strip()]

            # Add Title Box
            txBox = slide.shapes.add_textbox(Inches(1), Inches(0.8), Inches(11.333), Inches(1))
            tf = txBox.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            title_text = lines[0] if lines else f"Page {page_idx + 1}"
            p.text = title_text[:80]
            p.font.size = Pt(28)
            p.font.bold = True

            # Add Body Box
            bodyBox = slide.shapes.add_textbox(Inches(1), Inches(2.2), Inches(11.333), Inches(4.5))
            btf = bodyBox.text_frame
            btf.word_wrap = True

            body_lines = lines[1:] if len(lines) > 1 else []
            for bline in body_lines[:10]:
                bp = btf.add_paragraph()
                bp.text = f"• {bline}"
                bp.font.size = Pt(16)

        out_buffer = io.BytesIO()
        prs.save(out_buffer)
        output_bytes = out_buffer.getvalue()

        # Validate PPTX OpenXML container
        OutputValidator.validate_openxml_output(output_bytes, format_name="PPTX")

        metrics = {
            "slides_created": page_count,
            "format": "pptx",
            "output_size_bytes": len(output_bytes)
        }

        clean_name = filename.rsplit('.', 1)[0] + ".pptx"
        return output_bytes, clean_name, metrics
