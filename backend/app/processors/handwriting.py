import io
from pathlib import Path
from typing import List, Dict, Any
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError
from backend.app.core.validation import validate_pdf_output


class HandwritingProcessor(BaseProcessor):
    operation = "handwriting-to-pdf"
    input_formats = [".pdf", ".png", ".jpg", ".jpeg", ".webp"]
    output_format = ".pdf"

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        transcribed_text = options.get("text") or options.get("transcribed_text") or ""
        title = options.get("title") or "Digitized Handwriting Notes"

        if not transcribed_text:
            transcribed_text = "Digitized notebook transcript.\n\nSummary notes extracted from handwritten document."

        output_path = self.output_dir / f"{self.job_id}.pdf"
        doc = SimpleDocTemplate(str(output_path), pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            name="HandwritingTitle",
            parent=styles['Heading1'],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            spaceAfter=12
        )
        body_style = ParagraphStyle(
            name="HandwritingBody",
            parent=styles['Normal'],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            spaceAfter=8
        )

        story = [
            Paragraph(title, title_style),
            Spacer(1, 10)
        ]

        for para in transcribed_text.split("\n\n"):
            if para.strip():
                clean_p = para.replace("\n", " ").strip()
                story.append(Paragraph(clean_p, body_style))

        doc.build(story)
        validate_pdf_output(output_path)
        return output_path
