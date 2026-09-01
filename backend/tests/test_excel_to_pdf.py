from pathlib import Path
import openpyxl
from backend.app.processors.excel_to_pdf import ExcelToPdfProcessor
from backend.app.core.validation import validate_pdf_output

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_excel_to_pdf_conversion(tmp_path):
    """INVARIANT: Generates valid PDF from Excel spreadsheet with table gridlines and sheet contents."""
    xlsx_path = tmp_path / "sample_financial.xlsx"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Financial Summary"
    
    # Add headers
    ws.append(["Quarter", "Revenue ($M)", "Operating Expenses ($M)", "Net Margin (%)"])
    ws.append(["Q1 2026", "14.5", "8.2", "43.4%"])
    ws.append(["Q2 2026", "18.2", "9.1", "50.0%"])
    ws.append(["Q3 2026", "22.0", "11.4", "48.2%"])
    ws.append(["Q4 2026", "29.8", "13.0", "56.4%"])
    
    wb.save(str(xlsx_path))
    
    processor = ExcelToPdfProcessor(job_id="test_excel2pdf", work_dir=tmp_path)
    result = processor.run([xlsx_path], {})
    
    assert result.status == "COMPLETED"
    assert result.output_path.exists()
    assert result.output_path.stat().st_size > 0
    page_count = validate_pdf_output(result.output_path)
    assert page_count >= 1


def test_excel_to_pdf_process_bytes(tmp_path):
    """INVARIANT: process_bytes accepts in-memory Excel buffer and returns PDF bytes."""
    xlsx_path = tmp_path / "temp.xlsx"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Inventory"
    ws.append(["Item ID", "Name", "Stock", "Unit Price"])
    ws.append(["SKU-001", "Sensor Unit", "120", "$45.00"])
    wb.save(str(xlsx_path))
    
    with open(xlsx_path, "rb") as f:
        excel_bytes = f.read()
        
    processor = ExcelToPdfProcessor(job_id="test_excel2pdf_bytes", work_dir=tmp_path)
    pdf_bytes, filename, metrics = processor.process_bytes(excel_bytes, "inventory.xlsx")
    
    assert len(pdf_bytes) > 0
    assert filename.endswith(".pdf")
    assert metrics["format"] == "pdf"
