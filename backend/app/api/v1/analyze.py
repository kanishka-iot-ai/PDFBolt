from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from backend.app.processors.analyzer import PDFAnalyzer
from backend.app.models.schemas import AnalysisResult
from backend.app.core.security import sanitize_filename

router = APIRouter(tags=["PDF Intelligence"])


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_pdf(
    file: UploadFile = File(...)
):
    """
    Analyzes PDF document composition (page count, images, fonts, tables, topics, reading time)
    and produces an automatic compression & conversion recommendation.
    """
    content = await file.read()
    clean_name = sanitize_filename(file.filename or "document.pdf")
    return PDFAnalyzer.analyze(content, clean_name)
