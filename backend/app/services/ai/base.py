from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from backend.app.models.handwriting import (
    PageRecognitionResult,
    ConfidenceLevel,
    DocumentStructure,
    EnhancementAction
)


class HandwritingAIProvider(ABC):
    """
    Abstract Base Class for all Handwriting Recognition & AI Providers.
    Decouples the system from specific vendors (Gemini, OpenAI, Anthropic, Tesseract).
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. 'gemini', 'local_tesseract', 'fallback')"""
        pass

    @abstractmethod
    async def recognize_page(
        self,
        image_bytes: bytes,
        page_number: int = 1,
        options: Optional[Dict[str, Any]] = None
    ) -> PageRecognitionResult:
        """
        Recognizes handwriting on a single page image.
        Returns faithful structured text, confidence scores, and handwriting detection flag.
        """
        pass

    @abstractmethod
    async def enhance_transcription(
        self,
        raw_text: str,
        action: EnhancementAction = EnhancementAction.IMPROVE_RECOGNITION,
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Cleans OCR artifacts, restores sentence capitalization, preserves lists/tables
        without hallucinating missing words.
        """
        pass

    def estimate_confidence(self, text: str) -> float:
        """
        Estimates transcription confidence based on character validity and dictionary heuristics.
        """
        if not text or len(text.strip()) == 0:
            return 0.0

        words = text.split()
        if not words:
            return 0.0

        # Heuristic scoring: Ratio of valid alpha-numeric words vs corrupt character garbage
        valid_words = 0
        for w in words:
            clean = "".join(c for c in w if c.isalnum())
            if len(clean) >= 2 and any(c.isalpha() for c in clean):
                valid_words += 1

        ratio = valid_words / max(1, len(words))
        # Map ratio to 0.5 - 0.98 range
        confidence = min(0.98, max(0.40, ratio * 0.95))
        return round(confidence, 2)

    def determine_confidence_level(self, score: float) -> ConfidenceLevel:
        if score >= 0.85:
            return ConfidenceLevel.HIGH
        elif score >= 0.65:
            return ConfidenceLevel.MEDIUM
        return ConfidenceLevel.LOW
