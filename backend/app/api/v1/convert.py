import os
import uuid
import shutil
import tempfile
import asyncio
from pathlib import Path
from typing import Optional
import httpx
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, status, Depends
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
from backend.app.core.security import verify_partner_api_key, PartnerIdentity
from backend.app.processors.base import LIBREOFFICE_SEMAPHORE

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
async def convert_word_to_pdf(file: UploadFile = File(...), caller: PartnerIdentity = Depends(verify_partner_api_key)):
    if caller.is_authenticated_partner and not caller.can_access_feature("word_to_pdf"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FEATURE_NOT_PERMITTED", "message": "This API key does not have permission to execute the 'word_to_pdf' feature.", "allowed_features": caller.allowed_features}
        )
    filename = file.filename or "document.docx"
    ext = Path(filename).suffix.lower()

    if ext not in [".docx", ".doc"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Uploaded file must be a .docx or .doc file."
        )

    file_bytes = await file.read()
    if len(file_bytes) > settings.HEAVY_CONVERSION_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({round(len(file_bytes)/(1024*1024), 1)} MB) exceeds the free conversion limit of 25 MB (aligned with industry standard). Please compress images inside your document or upload a smaller file."
        )
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
        def _run_soffice():
            with LIBREOFFICE_SEMAPHORE:
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

        await asyncio.to_thread(_run_soffice)

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

    pdf_bytes = await file.read()
    if len(pdf_bytes) > settings.HEAVY_CONVERSION_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({round(len(pdf_bytes)/(1024*1024), 1)} MB) exceeds the free conversion limit of 25 MB (aligned with industry standard). Please use our Compress PDF tool first."
        )

    with open(input_pdf_path, "wb") as f:
        f.write(pdf_bytes)

    try:
        # Step A: Check if PDF has digital text
        is_digital = has_digital_text(input_pdf_path)

        if is_digital and HAS_PDF2DOCX:
            # Step B (Digital Path): pdf2docx converts layout, tables, fonts & images safely (single worker to prevent OOM)
            def _convert_digital():
                cv = Converter(input_pdf_path)
                cv.convert(output_docx_path, multi_processing=False, cpu_count=1)
                cv.close()
            await asyncio.to_thread(_convert_digital)
        elif HAS_OCR:
            # Step C (Scanned / Camera Path): OCR with bounded DPI and immediate memory cleanup
            def _convert_scanned():
                import gc
                images = convert_from_path(input_pdf_path, dpi=150)
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
                    try:
                        image.close()
                    except Exception:
                        pass
                    
                    for line in ocr_text.splitlines():
                        clean_line = line.strip()
                        if clean_line:
                            p = doc.add_paragraph(clean_line)
                            p.paragraph_format.line_spacing = 1.15
                            p.paragraph_format.space_after = Pt(4)

                doc.save(output_docx_path)
                del images
                gc.collect()

            await asyncio.to_thread(_convert_scanned)
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
    if len(file_bytes) > settings.HEAVY_CONVERSION_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({round(len(file_bytes)/(1024*1024), 1)} MB) exceeds the free conversion limit of 25 MB (aligned with industry standard). Please compress images inside your document or upload a smaller file."
        )
    output_filename = f"{Path(filename).stem}.pdf"

    # Local Headless LibreOffice Conversion with High-Fidelity Python Fallback
    temp_dir = tempfile.mkdtemp(prefix="libreoffice_excel_conv_")
    input_path = os.path.join(temp_dir, filename)
    output_path = os.path.join(temp_dir, output_filename)
    profile_dir = tempfile.mkdtemp(prefix="lo_prof_api_")

    with open(input_path, "wb") as f:
        f.write(file_bytes)

    try:
        import subprocess
        # Search for soffice / libreoffice binary
        soffice_bin = shutil.which("soffice") or shutil.which("libreoffice")
        if not soffice_bin:
            for wp in [
                r"C:\Program Files\LibreOffice\program\soffice.exe",
                r"C:\Program Files\LibreOffice\program\libreoffice.exe",
                r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
                r"C:\Program Files (x86)\LibreOffice\program\libreoffice.exe",
            ]:
                if os.path.exists(wp):
                    soffice_bin = wp
                    break

        converted = False
        if soffice_bin:
            try:
                def _run_excel_soffice():
                    with LIBREOFFICE_SEMAPHORE:
                        profile_url = Path(profile_dir).as_uri()
                        cmd = [
                            soffice_bin,
                            f"-env:UserInstallation={profile_url}",
                            "--headless",
                            "--convert-to",
                            "pdf",
                            "--outdir",
                            temp_dir,
                            input_path
                        ]
                        subprocess.run(cmd, check=True, timeout=120, capture_output=True)

                await asyncio.to_thread(_run_excel_soffice)

                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    converted = True
                else:
                    candidates = [
                        os.path.join(temp_dir, f) for f in os.listdir(temp_dir)
                        if f.endswith(".pdf") and os.path.getsize(os.path.join(temp_dir, f)) > 0
                    ]
                    if candidates:
                        output_path = candidates[0]
                        converted = True
            except Exception as lo_err:
                logger.warning(f"LibreOffice convert API failed, falling back to python engine: {lo_err}")

        if not converted:
            from backend.app.processors.excel_to_pdf import ExcelToPdfProcessor
            processor = ExcelToPdfProcessor(job_id=str(uuid.uuid4()), temp_dir=Path(temp_dir), output_dir=Path(temp_dir))
            converted = processor._convert_python_native(Path(input_path), Path(output_path))

        if not converted or not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Local LibreOffice Excel conversion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Excel to PDF conversion failed: {str(e)}"
        )
    finally:
        shutil.rmtree(profile_dir, ignore_errors=True)
        cleanup_temp_dir(temp_dir)

