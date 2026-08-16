import io
import re
from typing import Dict, Any
import pypdf
from backend.app.validators.input_validator import InputValidator
from backend.app.models.schemas import AnalysisResult
from backend.app.core.errors import PDFProcessingException, ErrorCode


class PDFAnalyzer:
    @classmethod
    def analyze(cls, content: bytes, filename: str) -> AnalysisResult:
        InputValidator.validate_file_size(content)
        detected_type = InputValidator.sniff_magic_bytes(content)

        if detected_type != "pdf":
            raise PDFProcessingException(
                error_code=ErrorCode.INVALID_MAGIC_BYTES,
                message="File is not a valid PDF document.",
                status_code=400
            )

        reader = pypdf.PdfReader(io.BytesIO(content))
        page_count = len(reader.pages)
        is_encrypted = reader.is_encrypted
        pdf_version = reader.pdf_header

        total_images = 0
        total_text_chars = 0
        all_words = []
        fonts = set()

        if not is_encrypted:
            for page in reader.pages[:15]:  # Analyze up to first 15 pages for speed
                text = page.extract_text() or ""
                total_text_chars += len(text)
                words = re.findall(r'\b[A-Za-z]{4,}\b', text.lower())
                all_words.extend(words)
                total_images += len(page.images)

        # Topic Extraction
        stop_words = {"this", "that", "with", "from", "have", "more", "will", "page", "document", "report", "table"}
        word_freq = {}
        for w in all_words:
            if w not in stop_words:
                word_freq[w] = word_freq.get(w, 0) + 1
        
        top_topics = [f"#{k.capitalize()}" for k, _ in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]]

        # Categorization & Recommendation
        size_bytes = len(content)
        avg_page_size = size_bytes / max(1, page_count)

        if total_images == 0 and total_text_chars > 300:
            doc_type = "text-heavy"
            rec_profile = "high"
            exp_reduction = "30%-50%"
            rec_reason = "This document is primarily text & fonts. High Quality preserves crisp vector typography."
            opt_potential = "moderate"
        elif total_images >= 3 or avg_page_size > 1.5 * 1024 * 1024:
            doc_type = "image-heavy"
            rec_profile = "balanced"
            exp_reduction = "55%-75%"
            rec_reason = "This PDF contains high-resolution embedded images. Balanced downsampling will save significant space."
            opt_potential = "high"
        elif total_text_chars < 50 and total_images > 0:
            doc_type = "scanned"
            rec_profile = "high_compression"
            exp_reduction = "60%-80%"
            rec_reason = "This appears to be a scanned archive document. High Compression optimizes image density."
            opt_potential = "very-high"
        else:
            doc_type = "mixed"
            rec_profile = "balanced"
            exp_reduction = "45%-65%"
            rec_reason = "Balanced profile achieves high file size reduction while maintaining clear readability."
            opt_potential = "high"

        return AnalysisResult(
            success=True,
            filename=filename,
            size_bytes=size_bytes,
            page_count=page_count,
            pdf_version=pdf_version,
            is_encrypted=is_encrypted,
            text_present=total_text_chars > 50,
            image_count=total_images,
            font_count=max(1, len(fonts)),
            table_count=1 if "\t" in "".join(all_words) else 0,
            reading_time_minutes=max(1, len(all_words) // 200),
            detected_type=doc_type,
            recommended_profile=rec_profile,
            expected_reduction=exp_reduction,
            optimization_potential=opt_potential,
            recommendation_reason=rec_reason,
            summary=f"Analyzed {page_count} page document containing {total_images} images and approximately {len(all_words)} words.",
            topics=top_topics
        )
