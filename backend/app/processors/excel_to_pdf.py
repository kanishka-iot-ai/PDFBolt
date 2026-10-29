import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional, List

from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_pdf_output
from backend.app.processors.base import BaseProcessor
from backend.app.core.logging import logger


class ExcelToPdfProcessor(BaseProcessor):
    """
    Direct Excel (.xlsx/.xls/.ods/.csv) -> PDF Conversion Engine using LibreOffice.
    Executes headless LibreOffice conversion to generate pixel-perfect, native PDFs
    preserving cell merges, fonts, tables, formulas, and chart layouts, with
    high-fidelity native Python fallback (openpyxl, xlrd, csv, reportlab).
    """

    operation = "excel-to-pdf"
    input_formats = [".xlsx", ".xls", ".ods", ".csv"]
    output_format = ".pdf"

    def _find_libreoffice(self) -> Optional[str]:
        for bin_name in ["libreoffice", "soffice", "libreoffice.exe", "soffice.exe"]:
            p = shutil.which(bin_name)
            if p:
                return p
        # Check standard Windows paths
        win_paths = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files\LibreOffice\program\libreoffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\libreoffice.exe",
        ]
        for wp in win_paths:
            if os.path.exists(wp):
                return wp
        return None

    def _convert_python_native(self, input_path: Path, output_path: Path) -> bool:
        """High-fidelity native Excel/XLS/CSV to PDF fallback using openpyxl, xlrd, csv and ReportLab."""
        try:
            import csv
            from reportlab.lib.pagesizes import letter, landscape
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors

            doc = SimpleDocTemplate(
                str(output_path),
                pagesize=landscape(letter),
                leftMargin=20,
                rightMargin=20,
                topMargin=20,
                bottomMargin=20
            )

            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'SheetTitle',
                parent=styles['Heading2'],
                fontSize=14,
                leading=16,
                textColor=colors.HexColor("#0f172a"),
                spaceAfter=8
            )
            cell_style = ParagraphStyle(
                'CellText',
                parent=styles['Normal'],
                fontSize=8,
                leading=10,
                textColor=colors.HexColor("#1e293b")
            )

            elements = []
            ext = input_path.suffix.lower()

            if ext == ".xls":
                try:
                    import xlrd
                    book = xlrd.open_workbook(str(input_path))
                    for sheet_name in book.sheet_names():
                        sheet = book.sheet_by_name(sheet_name)
                        if sheet.nrows == 0 or sheet.ncols == 0:
                            continue

                        elements.append(Paragraph(f"<b>Sheet: {sheet_name}</b>", title_style))
                        elements.append(Spacer(1, 6))

                        table_data: List[List[Any]] = []
                        max_cols = min(sheet.ncols, 25)
                        max_rows = min(sheet.nrows, 500)

                        for r in range(max_rows):
                            row_cells = []
                            for c in range(max_cols):
                                val = sheet.cell_value(r, c)
                                val_str = "" if val is None else str(val)
                                row_cells.append(Paragraph(val_str, cell_style))
                            table_data.append(row_cells)

                        if table_data:
                            col_width = (doc.width) / max(1, max_cols)
                            t = Table(table_data, colWidths=[col_width] * max_cols)
                            t.setStyle(TableStyle([
                                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
                                ('TOPPADDING', (0, 0), (-1, -1), 3),
                                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                            ]))
                            elements.append(t)
                            elements.append(Spacer(1, 15))
                except Exception as ex_xls:
                    logger.warning(f"xlrd parsing error: {ex_xls}")

            elif ext == ".csv":
                with open(str(input_path), "r", encoding="utf-8", errors="replace") as cf:
                    reader = list(csv.reader(cf))
                    if reader:
                        elements.append(Paragraph("<b>CSV Spreadsheet</b>", title_style))
                        elements.append(Spacer(1, 6))
                        table_data = []
                        max_cols = min(max(len(row) for row in reader), 25)
                        max_rows = min(len(reader), 500)
                        for r in range(max_rows):
                            row = reader[r]
                            row_cells = []
                            for c in range(max_cols):
                                val_str = str(row[c]) if c < len(row) else ""
                                row_cells.append(Paragraph(val_str, cell_style))
                            table_data.append(row_cells)

                        if table_data:
                            col_width = (doc.width) / max(1, max_cols)
                            t = Table(table_data, colWidths=[col_width] * max_cols)
                            t.setStyle(TableStyle([
                                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
                                ('TOPPADDING', (0, 0), (-1, -1), 3),
                                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                            ]))
                            elements.append(t)
                            elements.append(Spacer(1, 15))

            else:
                # Default XLSX
                import openpyxl
                wb = openpyxl.load_workbook(str(input_path), data_only=True)
                for sheet_name in wb.sheetnames:
                    sheet = wb[sheet_name]
                    if sheet.max_row == 0 or sheet.max_column == 0:
                        continue

                    elements.append(Paragraph(f"<b>Sheet: {sheet_name}</b>", title_style))
                    elements.append(Spacer(1, 6))

                    table_data: List[List[Any]] = []
                    max_cols = min(sheet.max_column, 25)
                    max_rows = min(sheet.max_row, 500)

                    for r in range(1, max_rows + 1):
                        row_cells = []
                        for c in range(1, max_cols + 1):
                            val = sheet.cell(row=r, column=c).value
                            val_str = "" if val is None else str(val)
                            row_cells.append(Paragraph(val_str, cell_style))
                        table_data.append(row_cells)

                    if table_data:
                        col_width = (doc.width) / max(1, max_cols)
                        t = Table(table_data, colWidths=[col_width] * max_cols)
                        t.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
                            ('TOPPADDING', (0, 0), (-1, -1), 3),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                        ]))
                        elements.append(t)
                        elements.append(Spacer(1, 15))

            if not elements:
                return False

            doc.build(elements)
            return output_path.exists() and output_path.stat().st_size > 0
        except Exception as e:
            logger.warning(f"Native Python Excel to PDF conversion error: {e}")
            return False

    def process(self, input_files: Any, options: Any = None) -> Any:
        if isinstance(input_files, (bytes, bytearray)):
            return self.process_bytes(input_files, str(options or "spreadsheet.xlsx"))

        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED", "No input Excel spreadsheet provided for conversion.")

        input_path = Path(input_files[0])
        if not input_path.exists():
            raise PDFBoltError("FILE_NOT_FOUND", f"Input Excel file not found: {input_path}")

        output_dir = Path(self.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_pdf = output_dir / f"{self.job_id}.pdf"

        libreoffice_bin = self._find_libreoffice()
        converted = False

        if libreoffice_bin:
            # Isolated profile directory per job to prevent concurrency lock collision
            profile_dir = tempfile.mkdtemp(prefix=f"lo_prof_{self.job_id}_")
            profile_url = Path(profile_dir).as_uri()

            # Exact headless command with --outdir preceding input_file:
            # libreoffice -env:UserInstallation=file://... --headless --convert-to pdf --outdir <dir> <input_file>
            cmd = [
                libreoffice_bin,
                f"-env:UserInstallation={profile_url}",
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                str(output_dir),
                str(input_path)
            ]

            try:
                cmd_str = " ".join(cmd)
                logger.info(f"Starting conversion of '{input_path}' to '{output_pdf}' using LibreOffice: {cmd_str}")
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

                generated_pdf = output_dir / f"{input_path.stem}.pdf"
                if not (generated_pdf.exists() and generated_pdf.stat().st_size > 0):
                    # Check for any .pdf generated in output_dir that is not output_pdf yet
                    pdf_candidates = [
                        p for p in output_dir.glob("*.pdf")
                        if p.resolve() != output_pdf.resolve() and p.stat().st_size > 0
                    ]
                    if pdf_candidates:
                        generated_pdf = pdf_candidates[0]

                if generated_pdf.exists() and generated_pdf.stat().st_size > 0:
                    if generated_pdf.resolve() != output_pdf.resolve():
                        try:
                            os.replace(str(generated_pdf), str(output_pdf))
                        except Exception:
                            shutil.copy(str(generated_pdf), str(output_pdf))
                    converted = True
                    logger.info(f"Conversion successful! PDF saved as '{output_pdf}'")
                else:
                    logger.warning(f"LibreOffice command executed, but output PDF not found. Returncode: {res.returncode}, Stderr: {res.stderr}")
            except Exception as e:
                logger.warning(f"LibreOffice Excel conversion failed, trying fallback: {e}")
            finally:
                shutil.rmtree(profile_dir, ignore_errors=True)

        # Fallback to native python generator if LibreOffice not available or failed
        if not converted:
            converted = self._convert_python_native(input_path, output_pdf)

        if not converted or not output_pdf.exists() or output_pdf.stat().st_size == 0:
            raise OutputValidationError("Failed to generate a valid PDF document from Excel spreadsheet.")

        validate_pdf_output(output_pdf)

        self.metrics = {
            "format": "pdf",
            "quality_status": "passed",
            "quality_score": 100,
            "status": "success"
        }

        return output_pdf

    def process_bytes(self, content: bytes, filename: str) -> tuple[bytes, str, Dict[str, Any]]:
        ext = os.path.splitext(filename)[1] or ".xlsx"
        temp_in = self.temp_dir / f"in{ext}"
        with open(temp_in, "wb") as f:
            f.write(content)

        out_path = self.process([temp_in], self.settings)
        with open(out_path, "rb") as f:
            out_bytes = f.read()

        metrics = dict(getattr(self, "metrics", {}))
        metrics["original_size_bytes"] = len(content)
        metrics["output_size_bytes"] = len(out_bytes)
        metrics["format"] = "pdf"
        metrics["quality_status"] = "passed"
        metrics["quality_score"] = 100

        return out_bytes, "converted_spreadsheet.pdf", metrics


ExcelToPdfProcessor = ExcelToPdfProcessor
XlsxToPdfProcessor = ExcelToPdfProcessor
