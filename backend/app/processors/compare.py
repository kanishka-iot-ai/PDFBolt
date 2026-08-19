import os
import io
import difflib
from pathlib import Path
from typing import List, Dict, Any, Optional
import pymupdf

from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.core.logging import logger


class CompareProcessor(BaseProcessor):
    operation = "compare"
    input_formats = [".pdf"]
    output_format = ".pdf"

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            raise PDFBoltError("MULTIPLE_FILES_REQUIRED", "Compare PDF requires two documents (Document A and Document B).")
        opts = options or {}
        if not input_files or len(input_files) < 2:
            if len(input_files) == 1:
                # If only 1 file passed, compare against itself or duplicate
                input_files = [input_files[0], input_files[0]]
            else:
                raise PDFBoltError("MULTIPLE_FILES_REQUIRED", "Compare PDF requires two PDF documents.")

        file_a_path = input_files[0]
        file_b_path = input_files[1]
        output_path = self.output_dir / f"{self.job_id}.pdf"

        try:
            doc_a = pymupdf.open(str(file_a_path))
            doc_b = pymupdf.open(str(file_b_path))

            text_a = "\n".join([page.get_text() for page in doc_a])
            text_b = "\n".join([page.get_text() for page in doc_b])

            lines_a = [l.strip() for l in text_a.splitlines() if l.strip()]
            lines_b = [l.strip() for l in text_b.splitlines() if l.strip()]

            # Compute similarity score
            matcher = difflib.SequenceMatcher(None, text_a, text_b)
            similarity_pct = round(matcher.ratio() * 100, 1)

            diff_lines = list(difflib.unified_diff(
                lines_a, lines_b,
                fromfile=f"Doc A: {file_a_path.name}",
                tofile=f"Doc B: {file_b_path.name}",
                lineterm=""
            ))

            additions = len([d for d in diff_lines if d.startswith("+") and not d.startswith("+++")])
            deletions = len([d for d in diff_lines if d.startswith("-") and not d.startswith("---")])

            # Generate Clean Comparison Report Document
            report = pymupdf.open()

            # Page 1: Executive Overview Report
            page = report.new_page(width=595, height=842)
            page.draw_rect(pymupdf.Rect(0, 0, 595, 842), fill=(0.98, 0.99, 1.0))

            # Header
            page.draw_rect(pymupdf.Rect(40, 40, 555, 110), fill=(0.06, 0.09, 0.16))
            page.insert_text((55, 70), "PDFBOLT DOCUMENT COMPARISON REPORT", fontsize=16, fontname="hebo", color=(1, 1, 1))
            page.insert_text((55, 92), f"Automated Structural & Textual Differential Analysis", fontsize=10, fontname="helv", color=(0.9, 0.7, 0.2))

            # Metrics Cards
            # Card 1: Similarity
            page.draw_rect(pymupdf.Rect(40, 125, 190, 195), fill=(1, 1, 1), color=(0.85, 0.88, 0.92))
            page.insert_text((55, 148), "SIMILARITY SCORE", fontsize=9, fontname="hebo", color=(0.4, 0.4, 0.5))
            page.insert_text((55, 180), f"{similarity_pct}%", fontsize=24, fontname="hebo", color=(0.1, 0.6, 0.3) if similarity_pct > 80 else (0.8, 0.4, 0.1))

            # Card 2: Additions
            page.draw_rect(pymupdf.Rect(205, 125, 365, 195), fill=(1, 1, 1), color=(0.85, 0.88, 0.92))
            page.insert_text((220, 148), "NEW ADDITIONS (+)", fontsize=9, fontname="hebo", color=(0.4, 0.4, 0.5))
            page.insert_text((220, 180), f"+{additions}", fontsize=24, fontname="hebo", color=(0.1, 0.6, 0.3))

            # Card 3: Deletions
            page.draw_rect(pymupdf.Rect(380, 125, 555, 195), fill=(1, 1, 1), color=(0.85, 0.88, 0.92))
            page.insert_text((395, 148), "REMOVED CONTENT (-)", fontsize=9, fontname="hebo", color=(0.4, 0.4, 0.5))
            page.insert_text((395, 180), f"-{deletions}", fontsize=24, fontname="hebo", color=(0.8, 0.2, 0.2))

            # File Details
            page.draw_rect(pymupdf.Rect(40, 210, 555, 275), fill=(1, 1, 1), color=(0.85, 0.88, 0.92))
            page.insert_text((55, 232), f"Document A (Original): {file_a_path.name} ({len(doc_a)} pages)", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.3))
            page.insert_text((55, 255), f"Document B (Modified): {file_b_path.name} ({len(doc_b)} pages)", fontsize=10, fontname="hebo", color=(0.2, 0.2, 0.3))


            # Detailed Differences
            y = 310
            page.insert_text((40, y), "DETAILED DIFFERENTIAL LOG:", fontsize=12, fontname="hebo", color=(0.1, 0.1, 0.2))
            y += 20

            if not diff_lines or len(diff_lines) <= 2:
                page.insert_text((40, y), "No text differences detected between Document A and Document B.", fontsize=11, fontname="helv", color=(0.3, 0.6, 0.3))
            else:
                for line in diff_lines:
                    if line.startswith("---") or line.startswith("+++") or line.startswith("@@"):
                        continue
                    
                    color = (0.2, 0.2, 0.2)
                    prefix = "  "
                    if line.startswith("+"):
                        color = (0.05, 0.55, 0.15)
                        prefix = "[ADDED]   "
                        line = line[1:].strip()
                    elif line.startswith("-"):
                        color = (0.75, 0.15, 0.15)
                        prefix = "[REMOVED] "
                        line = line[1:].strip()

                    display_text = f"{prefix}{line}"[:95]
                    page.insert_text((45, y), display_text, fontsize=9, fontname="helv", color=color)
                    y += 16

                    if y > 790:
                        page = report.new_page(width=595, height=842)
                        y = 50

            report.save(str(output_path), garbage=4, deflate=True)
            report.close()
            doc_a.close()
            doc_b.close()

            validate_pdf_output(output_path)
            return output_path
        except Exception as e:
            logger.error(f"Compare PDF execution error: {e}")
            raise PDFBoltError("COMPARE_FAILED", f"Failed to compare documents: {str(e)}")

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        # Fallback for single byte payload
        temp_in = self.temp_dir / "doc_a.pdf"
        with open(temp_in, "wb") as f:
            f.write(content)

        out_path = self.process([temp_in, temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        return out_bytes, "comparison_report.pdf", {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "format": "pdf",
            "quality_status": "passed"
        }


ComparePdfProcessor = CompareProcessor
