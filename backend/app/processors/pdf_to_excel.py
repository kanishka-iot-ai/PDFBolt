import io
import re
from typing import Tuple, Dict, Any
import pypdf
import openpyxl
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFProcessingException, ErrorCode
from backend.app.validators.output_validator import OutputValidator


def clean_cell_value(val: str) -> Any:
    val = val.strip()
    if not val:
        return ""
    # Currency/numeric cleanup
    num_str = re.sub(r'[\$,€£]', '', val).replace(',', '').strip()
    if num_str.replace('.', '', 1).isdigit():
        return float(num_str) if '.' in num_str else int(num_str)
    return val


class PDFToExcelProcessor(BaseProcessor):
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        page_count, is_enc = self.validate_input(content)
        if is_enc:
            raise PDFProcessingException(
                error_code=ErrorCode.ENCRYPTED_PDF,
                message="Cannot convert encrypted PDF to Excel without password.",
                status_code=400
            )

        wb = openpyxl.Workbook()
        # Remove default sheet
        wb.remove(wb.active)

        reader = pypdf.PdfReader(io.BytesIO(content))
        total_rows = 0

        for page_idx, page in enumerate(reader.pages):
            ws = wb.create_sheet(title=f"Page {page_idx + 1}")
            text = page.extract_text() or ""
            lines = [l for l in text.split('\n') if l.strip()]

            current_row = 1
            for line in lines:
                # Split columns by multiple whitespace or tab
                columns = re.split(r'\t+|\s{2,}', line.strip())
                for col_idx, col_val in enumerate(columns):
                    ws.cell(row=current_row, column=col_idx + 1, value=clean_cell_value(col_val))
                current_row += 1
                total_rows += 1

        out_buffer = io.BytesIO()
        wb.save(out_buffer)
        output_bytes = out_buffer.getvalue()

        # Validate OpenXML XLSX container
        OutputValidator.validate_openxml_output(output_bytes, format_name="XLSX")

        metrics = {
            "sheets_created": page_count,
            "total_rows_extracted": total_rows,
            "format": "xlsx",
            "output_size_bytes": len(output_bytes)
        }

        clean_name = filename.rsplit('.', 1)[0] + ".xlsx"
        return output_bytes, clean_name, metrics
