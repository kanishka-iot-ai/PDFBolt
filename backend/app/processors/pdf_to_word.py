import io
from typing import Tuple, Dict, Any
import pypdf
import docx
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFProcessingException, ErrorCode
from backend.app.validators.output_validator import OutputValidator


class PDFToWordProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        page_count, is_enc = self.validate_input(content)
        if is_enc:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Cannot convert encrypted PDF to Word without password.",
                status_code=400
            )

        doc = docx.Document()
        doc.add_heading(filename.rsplit('.', 1)[0], level=1)

        reader = pypdf.PdfReader(io.BytesIO(content))
        total_words = 0

        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

            if not paragraphs:
                lines = [line.strip() for line in text.split('\n') if line.strip()]
                for line in lines:
                    doc.add_paragraph(line)
                    total_words += len(line.split())
            else:
                for para in paragraphs:
                    doc.add_paragraph(para)
                    total_words += len(para.split())

            if page_idx < page_count - 1:
                doc.add_page_break()

        out_buffer = io.BytesIO()
        doc.save(out_buffer)
        output_bytes = out_buffer.getvalue()

        # Validate OpenXML container integrity
        OutputValidator.validate_openxml_output(output_bytes, format_name="DOCX")

        metrics = {
            "total_pages": page_count,
            "total_words_extracted": total_words,
            "format": "docx",
            "output_size_bytes": len(output_bytes)
        }

        clean_name = filename.rsplit('.', 1)[0] + ".docx"
        return output_bytes, clean_name, metrics
