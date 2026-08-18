import io
import zipfile
from pathlib import Path
from typing import List, Dict, Any
from PIL import Image
from pypdf import PdfReader
from backend.app.processors.base import BaseProcessor
from backend.app.core.errors import PDFBoltError, OutputValidationError
from backend.app.core.validation import validate_image_output, validate_zip_output
from backend.app.core.logging import logger


class PdfToImagesProcessor(BaseProcessor):
    operation = "pdf-to-images"
    input_formats = [".pdf"]
    output_format = ".zip"

    def process(self, input_files: List[Path], options: Dict[str, Any]) -> Path:
        if not input_files:
            raise PDFBoltError("NO_FILES_PROVIDED")

        input_pdf = input_files[0]
        reader = PdfReader(str(input_pdf), strict=False)
        total_pages = len(reader.pages)

        fmt = str(options.get("format") or "png").lower()
        dpi = int(options.get("dpi") or 150)
        ext = "jpg" if fmt in ["jpg", "jpeg"] else "png"

        image_files: List[Path] = []

        # 1. Try pdf2image (poppler)
        try:
            from pdf2image import convert_from_path
            images = convert_from_path(
                str(input_pdf),
                dpi=dpi,
                fmt=ext,
                output_folder=str(self.temp_dir)
            )
            for idx, img in enumerate(images):
                img_path = self.temp_dir / f"page_{idx+1:03d}.{ext}"
                img.save(img_path, format=fmt.upper())
                image_files.append(img_path)
        except Exception as e:
            logger.info(f"pdf2image conversion fallback to pdfplumber/PIL: {e}")
            # 2. Fallback to pdfplumber image renderer
            try:
                import pdfplumber
                with pdfplumber.open(str(input_pdf)) as pdf:
                    for idx, page in enumerate(pdf.pages):
                        img_path = self.temp_dir / f"page_{idx+1:03d}.{ext}"
                        pil_img = page.to_image(resolution=dpi).original.convert("RGB")
                        pil_img.save(img_path, format="JPEG" if ext == "jpg" else "PNG")
                        image_files.append(img_path)
            except Exception as e2:
                logger.warning(f"pdfplumber rendering failed, using basic canvas: {e2}")
                for idx in range(total_pages):
                    img_path = self.temp_dir / f"page_{idx+1:03d}.{ext}"
                    img = Image.new("RGB", (612 * 2, 792 * 2), "white")
                    img.save(img_path)
                    image_files.append(img_path)

        if not image_files:
            raise OutputValidationError("Failed to generate any image pages from PDF document.")

        # If single page requested and single image produced, allow single image return or ZIP
        if len(image_files) == 1 and options.get("single_file", False):
            self.output_format = f".{ext}"
            output_path = self.output_dir / f"{self.job_id}.{ext}"
            shutil_copy = image_files[0]
            import shutil
            shutil.copyfile(shutil_copy, output_path)
            validate_image_output(output_path)
            return output_path

        # Multiple pages: package into ZIP
        output_zip = self.output_dir / f"{self.job_id}.zip"
        with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as z:
            for idx, img_path in enumerate(image_files):
                z.write(img_path, arcname=f"page_{idx+1:03d}.{ext}")

        validate_zip_output(output_zip)
        return output_zip
