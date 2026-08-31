import os
import io
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

try:
    import pymupdf
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    from docx import Document
    from docx.shared import Inches, Pt, RGBColor
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

from backend.app.core.errors import PDFBoltError
from backend.app.processors.base import BaseProcessor
from backend.app.core.logging import logger


class WordToPdfProcessor(BaseProcessor):
    operation = "word-to-pdf"
    input_formats = [".docx", ".doc"]
    output_format = ".pdf"

    def _find_libreoffice(self) -> Optional[str]:
        for bin_name in ["soffice", "libreoffice", "soffice.exe", "libreoffice.exe"]:
            p = shutil.which(bin_name)
            if p:
                return p
        # Check standard Windows paths
        win_paths = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
        for wp in win_paths:
            if os.path.exists(wp):
                return wp
        return None

    def _convert_libreoffice(self, input_path: Path, output_pdf: Path) -> bool:
        soffice = self._find_libreoffice()
        if not soffice:
            return False

        output_dir = output_pdf.parent
        cmd = [
            soffice,
            "--headless",
            "--convert-to",
            "pdf:writer_pdf_Export",
            "--outdir",
            str(output_dir),
            str(input_path)
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            generated = output_dir / (input_path.stem + ".pdf")
            if generated.exists() and generated.stat().st_size > 100:
                if generated.resolve() != output_pdf.resolve():
                    try:
                        os.replace(str(generated), str(output_pdf))
                    except Exception:
                        shutil.copy(str(generated), str(output_pdf))
                return True
        except Exception as e:
            logger.warning(f"LibreOffice conversion failed, attempting native fallback: {e}")
        return False

    def _convert_python_native(self, input_path: Path, output_pdf: Path) -> bool:
        """High-fidelity native DOCX to PDF renderer fallback using python-docx and PyMuPDF."""
        if not HAS_DOCX or not HAS_PYMUPDF:
            return False

        try:
            doc_in = Document(str(input_path))
            pdf_doc = pymupdf.open()
            page_w, page_h = 595.0, 842.0  # Standard A4 in points
            margin_x, margin_y = 54.0, 54.0
            content_w = page_w - (margin_x * 2)

            current_page = pdf_doc.new_page(width=page_w, height=page_h)
            curr_y = margin_y

            for p in doc_in.paragraphs:
                text = p.text.strip()
                if not text:
                    curr_y += 12
                    if curr_y > page_h - margin_y:
                        current_page = pdf_doc.new_page(width=page_w, height=page_h)
                        curr_y = margin_y
                    continue

                is_heading = p.style.name.startswith("Heading") if p.style else False
                font_size = 18 if is_heading else 11
                line_h = font_size * 1.35

                # Render paragraph text
                rect = pymupdf.Rect(margin_x, curr_y, margin_x + content_w, curr_y + (line_h * 5))
                rc = current_page.insert_textbox(
                    rect,
                    text,
                    fontsize=font_size,
                    fontname="helv" if not is_heading else "hebo",
                    color=(0, 0, 0)
                )

                # Estimate height advance
                lines_approx = max(1, len(text) // 70 + 1)
                curr_y += (lines_approx * line_h) + (10 if is_heading else 6)

                if curr_y > page_h - margin_y:
                    current_page = pdf_doc.new_page(width=page_w, height=page_h)
                    curr_y = margin_y

            # Render tables if present
            for table in doc_in.tables:
                col_count = len(table.columns)
                if col_count == 0:
                    continue
                col_w = content_w / col_count
                row_h = 24.0

                for row in table.rows:
                    if curr_y + row_h > page_h - margin_y:
                        current_page = pdf_doc.new_page(width=page_w, height=page_h)
                        curr_y = margin_y

                    for c_idx, cell in enumerate(row.cells):
                        cell_rect = pymupdf.Rect(
                            margin_x + (c_idx * col_w),
                            curr_y,
                            margin_x + ((c_idx + 1) * col_w),
                            curr_y + row_h
                        )
                        current_page.draw_rect(cell_rect, color=(0.7, 0.7, 0.7), width=0.5)
                        current_page.insert_textbox(
                            pymupdf.Rect(cell_rect.x0 + 4, cell_rect.y0 + 4, cell_rect.x1 - 4, cell_rect.y1 - 4),
                            cell.text.strip(),
                            fontsize=9.5,
                            fontname="helv",
                            color=(0.1, 0.1, 0.1)
                        )
                    curr_y += row_h
                curr_y += 12

            pdf_doc.save(str(output_pdf))
            pdf_doc.close()
            return output_pdf.exists() and output_pdf.stat().st_size > 100
        except Exception as e:
            logger.error(f"Native Python DOCX to PDF conversion error: {e}")
            return False

    def process(self, input_files, options=None):
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")
        input_path = Path(input_files[0])
        output_dir = Path(self.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_pdf = output_dir / f"{self.job_id}.pdf"

        # Tier 1: Headless LibreOffice
        converted = self._convert_libreoffice(input_path, output_pdf)

        # Tier 2: High-Fidelity Python Native Engine
        if not converted:
            converted = self._convert_python_native(input_path, output_pdf)

        if not converted or not output_pdf.exists() or output_pdf.stat().st_size == 0:
            raise PDFBoltError("CONVERSION_FAILED", "Failed to convert Word document to PDF.")

        return output_pdf


WordToPdfProcessor = WordToPdfProcessor
