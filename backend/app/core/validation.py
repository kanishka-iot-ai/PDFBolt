from pathlib import Path
import zipfile
from backend.app.core.errors import OutputValidationError, PDFBoltError


def validate_pdf_file(path: Path) -> int:
    """
    Validate that an input file is an existing, non-empty, readable PDF.
    Returns page count.
    """
    if not path.exists() or path.stat().st_size == 0:
        raise PDFBoltError("FILE_EMPTY")

    with open(path, "rb") as f:
        header = f.read(8)
    if not header.startswith(b"%PDF-"):
        raise PDFBoltError("INVALID_MAGIC_BYTES")

    try:
        from pypdf import PdfReader
        reader = PdfReader(str(path), strict=False)
        if reader.is_encrypted:
            return 0
        return len(reader.pages)
    except PDFBoltError:
        raise
    except Exception as e:
        raise PDFBoltError("INVALID_PDF", f"Failed to parse PDF document: {e}")



def validate_pdf_output(path: Path) -> int:
    """
    Open output PDF with pypdf.
    Return page count.
    Raise OutputValidationError if invalid.
    """
    if not path.exists() or path.stat().st_size == 0:
        raise OutputValidationError("Output file is empty or does not exist")
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(path), strict=False)
        if reader.is_encrypted:
            return 0
        page_count = len(reader.pages)
        if page_count == 0:
            raise OutputValidationError("Output PDF has 0 pages")
        return page_count
    except OutputValidationError:
        raise
    except Exception as e:
        raise OutputValidationError(f"Output PDF unreadable or malformed: {e}")



def validate_docx_output(path: Path) -> None:
    """Validate DOCX is a valid ZIP with word/document.xml."""
    if not path.exists() or path.stat().st_size < 100:
        raise OutputValidationError("DOCX output too small or missing")
    try:
        with zipfile.ZipFile(path) as z:
            names = z.namelist()
            if "word/document.xml" not in names:
                raise OutputValidationError("Not a valid DOCX document structure")
    except zipfile.BadZipFile:
        raise OutputValidationError("DOCX is not a valid ZIP archive")


def validate_xlsx_output(path: Path) -> None:
    """Validate XLSX is a valid ZIP with xl/workbook.xml."""
    if not path.exists() or path.stat().st_size < 100:
        raise OutputValidationError("XLSX output too small or missing")
    try:
        with zipfile.ZipFile(path) as z:
            names = z.namelist()
            if "xl/workbook.xml" not in names:
                raise OutputValidationError("Not a valid XLSX workbook structure")
    except zipfile.BadZipFile:
        raise OutputValidationError("XLSX is not a valid ZIP archive")


def validate_pptx_output(path: Path) -> None:
    """Validate PPTX is a valid ZIP with ppt/presentation.xml."""
    if not path.exists() or path.stat().st_size < 100:
        raise OutputValidationError("PPTX output too small or missing")
    try:
        with zipfile.ZipFile(path) as z:
            names = z.namelist()
            if "ppt/presentation.xml" not in names:
                raise OutputValidationError("Not a valid PPTX presentation structure")
    except zipfile.BadZipFile:
        raise OutputValidationError("PPTX is not a valid ZIP archive")


def validate_image_output(path: Path) -> None:
    """Validate PNG/JPG/WebP is a real, decodable image."""
    if not path.exists() or path.stat().st_size < 100:
        raise OutputValidationError("Image output too small or missing")
    try:
        from PIL import Image
        with Image.open(path) as img:
            img.verify()
    except Exception as e:
        raise OutputValidationError(f"Image output invalid or corrupt: {e}")


def validate_zip_output(path: Path) -> None:
    """Validate ZIP is valid and contains at least one non-empty file."""
    if not path.exists() or path.stat().st_size < 22:
        raise OutputValidationError("ZIP output too small or missing")
    if not zipfile.is_zipfile(path):
        raise OutputValidationError("Not a valid ZIP file")
    with zipfile.ZipFile(path) as z:
        if len(z.namelist()) == 0:
            raise OutputValidationError("ZIP contains 0 files")


def validate_output_file(path: Path, fmt: str) -> None:
    """Route to correct output validator based on format extension."""
    fmt = fmt.lower().strip()
    if not fmt.startswith('.'):
        fmt = f".{fmt}"

    validators = {
        ".pdf"  : validate_pdf_output,
        ".docx" : validate_docx_output,
        ".xlsx" : validate_xlsx_output,
        ".pptx" : validate_pptx_output,
        ".zip"  : validate_zip_output,
        ".png"  : validate_image_output,
        ".jpg"  : validate_image_output,
        ".jpeg" : validate_image_output,
        ".webp" : validate_image_output,
    }
    validator = validators.get(fmt)
    if validator:
        validator(path)
    elif path.exists() and path.stat().st_size > 0:
        return
    else:
        raise OutputValidationError(f"Output file missing or empty for format: {fmt}")
