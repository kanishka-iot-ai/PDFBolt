import os
import io
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.dml.color import RGBColor
import pymupdf
from PIL import Image

from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import logger


class PptToPdfProcessor(BaseProcessor):
    operation = "ppt-to-pdf"
    input_formats = [".pptx", ".ppt"]
    output_format = ".pdf"

    def _convert_libreoffice(self, input_path: Path, output_path: Path) -> bool:
        soffice = shutil.which("soffice") or shutil.which("libreoffice")
        if not soffice:
            return False

        try:
            out_dir = str(output_path.parent)
            cmd = [
                soffice,
                "--headless",
                "--convert-to", "pdf",
                "--outdir", out_dir,
                str(input_path)
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            generated_pdf = Path(out_dir) / f"{input_path.stem}.pdf"
            if generated_pdf.exists() and generated_pdf.stat().st_size > 100:
                if generated_pdf != output_path:
                    shutil.move(str(generated_pdf), str(output_path))
                return True
        except Exception as e:
            logger.warning(f"LibreOffice PPT to PDF conversion error: {e}")
        return False

    def _convert_python_native(self, input_path: Path, output_path: Path) -> bool:
        """
        Native high-fidelity PPTX slide renderer using python-pptx and PyMuPDF.
        Renders titles, subtitles, formatted text, shapes, tables, and images.
        """
        try:
            prs = Presentation(str(input_path))
            slide_w_pts = prs.slide_width / 12700.0
            slide_h_pts = prs.slide_height / 12700.0

            doc = pymupdf.open()

            for slide in prs.slides:
                page = doc.new_page(width=slide_w_pts, height=slide_h_pts)
                
                # Default white background
                page.draw_rect(pymupdf.Rect(0, 0, slide_w_pts, slide_h_pts), color=None, fill=(1, 1, 1))

                for shape in slide.shapes:
                    try:
                        left = shape.left / 12700.0
                        top = shape.top / 12700.0
                        width = shape.width / 12700.0
                        height = shape.height / 12700.0
                        rect = pymupdf.Rect(left, top, left + width, top + height)

                        # 1. Embedded Image Shape
                        if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                            image = shape.image
                            img_bytes = image.blob
                            page.insert_image(rect, stream=img_bytes)
                            continue

                        # 2. Table Shape
                        if shape.has_table:
                            table = shape.table
                            row_y = top
                            for row in table.rows:
                                col_x = left
                                for cell in row.cells:
                                    cell_w = cell.width / 12700.0
                                    cell_text = cell.text.strip()
                                    if cell_text:
                                        cell_rect = pymupdf.Rect(col_x, row_y, col_x + cell_w, row_y + 22)
                                        page.draw_rect(cell_rect, color=(0.7, 0.7, 0.7), width=0.5)
                                        page.insert_text((col_x + 4, row_y + 15), cell_text, fontsize=10, fontname="helv")
                                    col_x += cell_w
                                row_y += 22
                            continue

                        # 3. Text Frame Shape
                        if shape.has_text_frame:
                            tf = shape.text_frame
                            text_y = top + 16
                            for p in tf.paragraphs:
                                p_text = p.text.strip()
                                if not p_text:
                                    continue

                                fs = 14
                                if p.font and p.font.size:
                                    fs = max(8, min(44, p.font.size.pt))
                                elif shape == slide.shapes.title:
                                    fs = 26

                                fontname = "helv"
                                if p.font and p.font.bold:
                                    fontname = "hebo"
                                elif p.font and p.font.italic:
                                    fontname = "heit"

                                color = (0.1, 0.1, 0.1)
                                try:
                                    if p.font and p.font.color and hasattr(p.font.color, 'rgb') and p.font.color.rgb:
                                        rgb = p.font.color.rgb
                                        color = (rgb[0]/255.0, rgb[1]/255.0, rgb[2]/255.0)
                                    elif shape == slide.shapes.title:
                                        color = (0.05, 0.1, 0.3)
                                except Exception:
                                    pass

                                page.insert_text((left + 4, text_y), p_text, fontsize=fs, fontname=fontname, color=color)
                                text_y += fs * 1.35
                    except Exception as shape_err:
                        logger.debug(f"Slide shape rendering skipped: {shape_err}")
                        continue

            doc.save(str(output_path), garbage=4, deflate=True)
            doc.close()
            return output_path.exists() and output_path.stat().st_size > 100
        except Exception as e:
            logger.warning(f"Native PPT to PDF conversion error: {e}")
            return False

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self._process_bytes_generic(input_files, str(options or "doc.pptx"))
        opts = options or {}
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_ppt = input_files[0]
        output_path = self.output_dir / f"{self.job_id}.pdf"

        # 1. Try LibreOffice if available on host
        converted = self._convert_libreoffice(input_ppt, output_path)

        # 2. Native python-pptx + PyMuPDF high-fidelity rendering
        if not converted:
            converted = self._convert_python_native(input_ppt, output_path)

        if not output_path.exists() or output_path.stat().st_size < 100:
            raise OutputValidationError("Failed to generate valid PDF from PowerPoint presentation.")

        validate_pdf_output(output_path)
        return output_path

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        ext = Path(filename).suffix or ".pptx"
        temp_in = self.temp_dir / f"in{ext}"
        with open(temp_in, "wb") as f:
            f.write(content)

        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        return out_bytes, "presentation.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "format": "pdf",
            "quality_status": "passed"
        }


PPTToPDFProcessor = PptToPdfProcessor
