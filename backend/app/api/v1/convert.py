import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse, Response
from pypdf import PdfReader

try:
    from pdf2docx import Converter
    HAS_PDF2DOCX = True
except ImportError:
    HAS_PDF2DOCX = False

try:
    from pdf2image import convert_from_path
    import pytesseract
    from docx import Document
    from docx.shared import Inches, Pt
    HAS_OCR = True
except ImportError:
    HAS_OCR = False

from backend.app.core.logging import logger
from backend.app.core.errors import PDFBoltError

router = APIRouter(prefix="/convert", tags=["Document Conversion"])

GOTENBERG_URL = os.getenv("GOTENBERG_URL", "http://gotenberg:3000")


def has_digital_text(pdf_path: str, min_chars: int = 40) -> bool:
    """Detects whether a PDF has searchable digital text or is a scanned image."""
    try:
        reader = PdfReader(pdf_path)
        total_chars = sum(len((page.extract_text() or "").strip()) for page in reader.pages)
        return total_chars >= min_chars
    except Exception as e:
        logger.warn(f"Failed to check digital text in {pdf_path}: {e}")
        return False


def cleanup_temp_dir(dir_path: str):
    """Safely removes temporary directory and files after response is completed."""
    try:
        shutil.rmtree(dir_path, ignore_errors=True)
    except Exception as e:
        logger.warn(f"Cleanup error for {dir_path}: {e}")


# ---------------------------------------------------------------------------
# 1. WORD TO PDF (Gotenberg HTTP Stream + Headless LibreOffice Fallback)
# ---------------------------------------------------------------------------
@router.post("/word-to-pdf", summary="Convert DOCX/DOC to PDF with exact margins & fonts")
async def convert_word_to_pdf(file: UploadFile = File(...)):
    filename = file.filename or "document.docx"
    ext = Path(filename).suffix.lower()

    if ext not in [".docx", ".doc"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Uploaded file must be a .docx or .doc file."
        )

    file_bytes = await file.read()
    output_filename = f"{Path(filename).stem}.pdf"

    # 1. Attempt conversion via Gotenberg LibreOffice HTTP container
    gotenberg_endpoint = f"{GOTENBERG_URL}/forms/libreoffice/convert"
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            files = {"files": (filename, file_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            response = await client.post(gotenberg_endpoint, files=files)

        if response.status_code == 200:
            return Response(
                content=response.content,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{output_filename}"'}
            )
    except Exception as e:
        logger.info(f"Gotenberg connection skipped or failed ({e}), falling back to local LibreOffice instance")

    # 2. Local Headless LibreOffice Fallback
    temp_dir = tempfile.mkdtemp(prefix="libreoffice_conv_")
    input_path = os.path.join(temp_dir, filename)
    output_path = os.path.join(temp_dir, output_filename)

    with open(input_path, "wb") as f:
        f.write(file_bytes)

    try:
        import subprocess
        cmd = [
            "soffice",
            "--headless",
            "--convert-to",
            "pdf:writer_pdf_Export",
            "--outdir",
            temp_dir,
            input_path
        ]
        subprocess.run(cmd, check=True, timeout=120, capture_output=True)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Word to PDF conversion produced no output."
            )

        with open(output_path, "rb") as f:
            pdf_data = f.read()

        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{output_filename}"'}
        )
    except Exception as e:
        logger.error(f"Local LibreOffice conversion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Word to PDF conversion failed: {str(e)}"
        )
    finally:
        cleanup_temp_dir(temp_dir)


# ---------------------------------------------------------------------------
# 2. PDF TO WORD (Digital Layout Preservation + Scanned Tesseract OCR Path)
# ---------------------------------------------------------------------------
@router.post("/pdf-to-word", summary="Convert PDF to Word DOCX (Native Text + Scanned OCR)")
async def convert_pdf_to_word(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    filename = file.filename or "document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Uploaded file must be a .pdf document."
        )

    temp_dir = tempfile.mkdtemp(prefix="pdf_to_word_")
    background_tasks.add_task(cleanup_temp_dir, temp_dir)

    input_pdf_path = os.path.join(temp_dir, "input.pdf")
    output_docx_path = os.path.join(temp_dir, f"{Path(filename).stem}.docx")

    with open(input_pdf_path, "wb") as f:
        f.write(await file.read())

    try:
        # Step A: Check if PDF has digital text
        is_digital = has_digital_text(input_pdf_path)

        if is_digital and HAS_PDF2DOCX:
            # Step B (Digital Path): pdf2docx converts layout, tables, fonts & images
            cv = Converter(input_pdf_path)
            cv.convert(output_docx_path, multi_processing=True, cpu_count=2)
            cv.close()
        elif HAS_OCR:
            # Step C (Scanned / Camera Path): OCR with pdf2image + Tesseract
            images = convert_from_path(input_pdf_path, dpi=300)
            doc = Document()

            for section in doc.sections:
                section.top_margin = Inches(1.0)
                section.bottom_margin = Inches(1.0)
                section.left_margin = Inches(1.0)
                section.right_margin = Inches(1.0)

            for i, image in enumerate(images):
                if i > 0:
                    doc.add_page_break()

                ocr_text = pytesseract.image_to_string(image, lang="eng")
                
                for line in ocr_text.splitlines():
                    clean_line = line.strip()
                    if clean_line:
                        p = doc.add_paragraph(clean_line)
                        p.paragraph_format.line_spacing = 1.15
                        p.paragraph_format.space_after = Pt(4)

            doc.save(output_docx_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="PDF conversion engine is missing required dependencies."
            )

        if not os.path.exists(output_docx_path) or os.path.getsize(output_docx_path) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Conversion failed to produce a valid DOCX output file."
            )

        return FileResponse(
            path=output_docx_path,
            filename=f"{Path(filename).stem}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

    except Exception as e:
        logger.error(f"PDF to Word conversion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF to Word conversion error: {str(e)}"
        )


# ---------------------------------------------------------------------------
# 3. EXCEL TO PDF (Headless LibreOffice Calc Conversion)
# ---------------------------------------------------------------------------
@router.post("/excel-to-pdf", summary="Convert XLSX/XLS/ODS/CSV to PDF with exact table layouts")
async def convert_excel_to_pdf(file: UploadFile = File(...)):
    filename = file.filename or "spreadsheet.xlsx"
    ext = Path(filename).suffix.lower()

    if ext not in [".xlsx", ".xls", ".ods", ".csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Uploaded file must be an Excel spreadsheet (.xlsx, .xls, .ods, .csv)."
        )

    file_bytes = await file.read()
    output_filename = f"{Path(filename).stem}.pdf"

    # Local Headless LibreOffice Conversion
    temp_dir = tempfile.mkdtemp(prefix="libreoffice_excel_conv_")
    input_path = os.path.join(temp_dir, filename)
    output_path = os.path.join(temp_dir, output_filename)

    with open(input_path, "wb") as f:
        f.write(file_bytes)

    try:
        import subprocess
        # Search for soffice / libreoffice binary
        soffice_bin = shutil.which("soffice") or shutil.which("libreoffice") or "libreoffice"
        cmd = [
            soffice_bin,
            "--headless",
            "--convert-to",
            "pdf",
            input_path,
            "--outdir",
            temp_dir
        ]
        subprocess.run(cmd, check=True, timeout=120, capture_output=True)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Excel to PDF conversion produced no output."
            )

        with open(output_path, "rb") as f:
            pdf_data = f.read()

        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{output_filename}"'}
        )
    except Exception as e:
        logger.error(f"Local LibreOffice Excel conversion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Excel to PDF conversion failed: {str(e)}"
        )
    finally:
        cleanup_temp_dir(temp_dir)

