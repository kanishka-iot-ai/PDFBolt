import io
import os
from typing import List, Optional
from reportlab.lib.pagesizes import A4, letter, A5
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    PageBreak,
    HRFlowable
)
from reportlab.pdfgen import canvas

from backend.app.models.handwriting import (
    PDFDesignSettingsPayload,
    PaperSize,
    MarginType,
    FontFamily,
    TextAlignment,
    ExportFormat
)


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute total page count and print
    professional running headers and footers with 'Page X of Y'.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []
        self.header_text = ""
        self.footer_text = ""
        self.include_page_numbers = True

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_header_footer(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColorRGB(0.4, 0.4, 0.4)

        # Header
        if self.header_text:
            self.drawString(54, self._pagesize[1] - 36, self.header_text)
            self.setStrokeColorRGB(0.85, 0.85, 0.85)
            self.setLineWidth(0.5)
            self.line(54, self._pagesize[1] - 42, self._pagesize[0] - 54, self._pagesize[1] - 42)

        # Footer
        footer_parts = []
        if self.footer_text:
            footer_parts.append(self.footer_text)
        
        if self.include_page_numbers:
            page_str = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(self._pagesize[0] - 54, 30, page_str)

        if footer_parts:
            self.drawString(54, 30, " | ".join(footer_parts))

        if self.footer_text or self.include_page_numbers:
            self.setStrokeColorRGB(0.85, 0.85, 0.85)
            self.setLineWidth(0.5)
            self.line(54, 45, self._pagesize[0] - 54, 45)

        self.restoreState()


class HandwritingDocumentGenerator:
    """
    Engine for generating clean, computer-typed PDF, DOCX, and TXT documents.
    """

    @classmethod
    def generate(
        cls,
        pages_text: List[str],
        title: str = "Handwritten Notes",
        design: Optional[PDFDesignSettingsPayload] = None,
        export_format: ExportFormat = ExportFormat.PDF
    ) -> bytes:
        design = design or PDFDesignSettingsPayload()

        if export_format == ExportFormat.DOCX:
            return cls._generate_docx(pages_text, title, design)
        elif export_format == ExportFormat.TXT:
            return cls._generate_txt(pages_text, title)
        else:
            return cls._generate_pdf(pages_text, title, design)

    @classmethod
    def _generate_pdf(
        cls,
        pages_text: List[str],
        title: str,
        design: PDFDesignSettingsPayload
    ) -> bytes:
        # Paper size resolution
        if design.paper_size == PaperSize.LETTER:
            pagesize = letter
        elif design.paper_size == PaperSize.A5:
            pagesize = A5
        else:
            pagesize = A4

        # Margin resolution
        if design.margin == MarginType.NARROW:
            margin = 36  # 0.5 in
        elif design.margin == MarginType.WIDE:
            margin = 108 # 1.5 in
        else:
            margin = 72  # 1.0 in (Normal)

        # Font resolution (Standard 14 PostScript fonts in ReportLab)
        font_map = {
            FontFamily.INTER: "Helvetica",
            FontFamily.ARIAL: "Helvetica",
            FontFamily.TIMES: "Times-Roman",
            FontFamily.GEORGIA: "Times-Roman",
            FontFamily.COURIER: "Courier"
        }
        font_name = font_map.get(design.font, "Helvetica")
        bold_font_name = "Times-Bold" if "Times" in font_name else ("Courier-Bold" if "Courier" in font_name else "Helvetica-Bold")

        # Alignment resolution
        align_map = {
            TextAlignment.LEFT: TA_LEFT,
            TextAlignment.CENTER: TA_CENTER,
            TextAlignment.JUSTIFY: TA_JUSTIFY
        }
        text_align = align_map.get(design.alignment, TA_LEFT)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=pagesize,
            leftMargin=margin,
            rightMargin=margin,
            topMargin=margin + 10,
            bottomMargin=margin + 10
        )

        styles = getSampleStyleSheet()
        leading = int(design.font_size * design.line_spacing)

        body_style = ParagraphStyle(
            name='HandwritingBody',
            fontName=font_name,
            fontSize=design.font_size,
            leading=leading,
            alignment=text_align,
            textColor='#1e293b',
            spaceAfter=8
        )

        title_style = ParagraphStyle(
            name='HandwritingTitle',
            fontName=bold_font_name,
            fontSize=design.font_size + 8,
            leading=design.font_size + 12,
            alignment=TA_LEFT,
            textColor='#0f172a',
            spaceAfter=12
        )

        story = []

        # Document Header / Title
        if title:
            story.append(Paragraph(title, title_style))
            story.append(HRFlowable(width="100%", thickness=1, color='#e2e8f0', spaceBefore=4, spaceAfter=14))

        for page_idx, page_content in enumerate(pages_text):
            if page_idx > 0:
                story.append(PageBreak())

            paragraphs = page_content.split('\n')
            for p in paragraphs:
                trimmed = p.strip()
                if not trimmed:
                    story.append(Spacer(1, 6))
                    continue

                # Escape XML characters for ReportLab Paragraph
                safe_text = (trimmed
                             .replace('&', '&amp;')
                             .replace('<', '&lt;')
                             .replace('>', '&gt;'))
                
                # Check for bullet points
                if safe_text.startswith('• ') or safe_text.startswith('- '):
                    bullet_text = f"&bull; {safe_text[2:]}"
                    story.append(Paragraph(bullet_text, body_style))
                else:
                    story.append(Paragraph(safe_text, body_style))

        # Canvas factory with running header/footer
        def canvas_maker(*args, **kwargs):
            c = NumberedCanvas(*args, **kwargs)
            c.header_text = design.header_text or ""
            c.footer_text = design.footer_text or ""
            c.include_page_numbers = design.include_page_numbers
            return c

        doc.build(story, canvasmaker=canvas_maker)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def _generate_docx(
        cls,
        pages_text: List[str],
        title: str,
        design: PDFDesignSettingsPayload
    ) -> bytes:
        from docx import Document
        from docx.shared import Inches, Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH

        doc = Document()

        # Set Margins
        margin_inches = 1.0
        if design.margin == MarginType.NARROW:
            margin_inches = 0.5
        elif design.margin == MarginType.WIDE:
            margin_inches = 1.5

        for section in doc.sections:
            section.top_margin = Inches(margin_inches)
            section.bottom_margin = Inches(margin_inches)
            section.left_margin = Inches(margin_inches)
            section.right_margin = Inches(margin_inches)

            if design.header_text:
                header = section.header
                header.paragraphs[0].text = design.header_text
            if design.footer_text:
                footer = section.footer
                footer.paragraphs[0].text = design.footer_text

        # Title
        if title:
            heading = doc.add_heading(title, level=1)
            heading.runs[0].font.color.rgb = RGBColor(15, 23, 42)

        # Alignment
        align_map = {
            TextAlignment.LEFT: WD_ALIGN_PARAGRAPH.LEFT,
            TextAlignment.CENTER: WD_ALIGN_PARAGRAPH.CENTER,
            TextAlignment.JUSTIFY: WD_ALIGN_PARAGRAPH.JUSTIFY
        }
        align_choice = align_map.get(design.alignment, WD_ALIGN_PARAGRAPH.LEFT)

        for page_idx, page_content in enumerate(pages_text):
            if page_idx > 0:
                doc.add_page_break()

            lines = page_content.split('\n')
            for line in lines:
                trimmed = line.strip()
                if not trimmed:
                    continue

                p = doc.add_paragraph()
                p.alignment = align_choice
                run = p.add_run(trimmed)
                run.font.name = design.font.value
                run.font.size = Pt(design.font_size)

        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def _generate_txt(cls, pages_text: List[str], title: str) -> bytes:
        content_lines = []
        if title:
            content_lines.append(f"=== {title.upper()} ===")
            content_lines.append("")

        for page_idx, page_content in enumerate(pages_text):
            content_lines.append(f"--- PAGE {page_idx + 1} ---")
            content_lines.append(page_content.strip())
            content_lines.append("")

        full_text = "\n".join(content_lines)
        return full_text.encode('utf-8')
