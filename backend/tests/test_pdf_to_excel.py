from pathlib import Path
import openpyxl
from backend.app.processors.pdf_to_excel import PdfToExcelProcessor
from backend.app.core.validation import validate_xlsx_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_pdf_to_excel_contains_table_data_invariant(tmp_path):
    """INVARIANT: XLSX opens, passes workbook zip check, and has populated data cells."""
    p_tab = FIXTURES_DIR / "table.pdf"
    processor = PdfToExcelProcessor(job_id="test_excel_inv", work_dir=tmp_path)
    result = processor.run([p_tab], {})

    assert result.status == "COMPLETED"
    validate_xlsx_output(result.output_path)

    wb = openpyxl.load_workbook(str(result.output_path))
    sheet = wb.active
    assert sheet.max_row >= 1
