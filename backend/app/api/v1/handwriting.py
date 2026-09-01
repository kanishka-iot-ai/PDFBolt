import io
import uuid
import base64
import time
from typing import List
from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import StreamingResponse

from backend.app.config import settings
from backend.app.models.handwriting import (
    HandwritingRecognitionRequest,
    HandwritingRecognitionResponse,
    TranscriptionEnhanceRequest,
    TranscriptionEnhanceResponse,
    HandwritingGenerateDocumentRequest,
    PageRecognitionResult,
    ConfidenceLevel,
    ExportFormat
)
from backend.app.services.ai.factory import get_handwriting_provider
from backend.app.processors.handwriting_to_pdf import HandwritingDocumentGenerator
from backend.app.services.cleanup_service import cleanup_service

router = APIRouter(prefix="/handwriting", tags=["Handwriting AI & Recognition"])


@router.post("/recognize", response_model=HandwritingRecognitionResponse)
async def recognize_handwriting_pages(request: HandwritingRecognitionRequest):
    """
    Recognizes handwritten documents across one or more pages.
    Supports AI-enhanced recognition with automatic fallback to local OCR.
    """
    if not request.pages:
        raise HTTPException(status_code=400, detail="No pages provided for recognition.")

    job_id = f"hw-{uuid.uuid4().hex[:12]}"
    provider = get_handwriting_provider(
        requested_provider=request.provider,
        ai_enhanced=request.ai_enhanced
    )

    page_results = []
    total_confidence = 0.0
    all_warnings = []

    for page_payload in request.pages:
        try:
            # Decode base64 image (stripping data URL header if present)
            raw_b64 = page_payload.image_base64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]

            image_bytes = base64.b64decode(raw_b64)
            result = await provider.recognize_page(
                image_bytes=image_bytes,
                page_number=page_payload.page_number
            )
            page_results.append(result)
            total_confidence += result.confidence
            if result.warnings:
                all_warnings.extend(result.warnings)

        except Exception as err:
            # Page failure recovery: do not fail entire job
            error_result = PageRecognitionResult(
                page_number=page_payload.page_number,
                text="",
                raw_text="",
                confidence=0.0,
                confidence_level=ConfidenceLevel.LOW,
                has_handwriting=False,
                uncertain_words=[],
                provider_used=provider.provider_name,
                processing_time_ms=0,
                warnings=[f"Failed to process page {page_payload.page_number}: {str(err)}"]
            )
            page_results.append(error_result)
            all_warnings.append(f"Page {page_payload.page_number} failed: {str(err)}")

    overall_confidence = round(total_confidence / max(1, len(page_results)), 2)
    if overall_confidence >= 0.85:
        overall_level = ConfidenceLevel.HIGH
    elif overall_confidence >= 0.65:
        overall_level = ConfidenceLevel.MEDIUM
    else:
        overall_level = ConfidenceLevel.LOW

    return HandwritingRecognitionResponse(
        success=True,
        job_id=job_id,
        pages=page_results,
        overall_confidence=overall_confidence,
        overall_confidence_level=overall_level,
        provider_used=provider.provider_name,
        warnings=list(set(all_warnings))
    )


@router.post("/enhance", response_model=TranscriptionEnhanceResponse)
async def enhance_transcription_text(request: TranscriptionEnhanceRequest):
    """
    Cleans OCR artifacts, corrects character errors, and structures transcription
    without hallucinating or rewriting text content.
    """
    if not request.text or not request.text.strip():
        return TranscriptionEnhanceResponse(
            success=True,
            enhanced_text="",
            original_text="",
            changes_made=[],
            provider_used="noop"
        )

    provider = get_handwriting_provider(ai_enhanced=True)
    enhanced = await provider.enhance_transcription(
        raw_text=request.text,
        action=request.action
    )

    changes = []
    if len(enhanced) != len(request.text):
        changes.append("Normalized line wrapping and spacing")
    if request.action == "fix_ocr_errors":
        changes.append("Corrected alphanumeric OCR character substitutions")

    return TranscriptionEnhanceResponse(
        success=True,
        enhanced_text=enhanced,
        original_text=request.text,
        changes_made=changes,
        provider_used=provider.provider_name
    )


@router.post("/generate")
async def generate_typed_document(request: HandwritingGenerateDocumentRequest):
    """
    Generates computer-typed PDF, DOCX, or TXT document with professional typography settings.
    """
    if not request.pages_text:
        raise HTTPException(status_code=400, detail="No page text provided.")

    try:
        output_bytes = HandwritingDocumentGenerator.generate(
            pages_text=request.pages_text,
            title=request.title or "Handwritten Notes",
            design=request.design,
            export_format=request.export_format
        )

        filename_title = (request.title or "Handwritten_Notes").replace(" ", "_")
        
        if request.export_format == ExportFormat.DOCX:
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            filename = f"{filename_title}.docx"
        elif request.export_format == ExportFormat.TXT:
            media_type = "text/plain; charset=utf-8"
            filename = f"{filename_title}.txt"
        else:
            media_type = "application/pdf"
            filename = f"{filename_title}.pdf"

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Robots-Tag": "noindex, nofollow, noarchive"
        }

        return Response(
            content=output_bytes,
            media_type=media_type,
            headers=headers
        )

    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Document generation error: {str(err)}")
