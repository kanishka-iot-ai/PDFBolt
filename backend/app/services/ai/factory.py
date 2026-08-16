from typing import Optional
from backend.app.config import settings
from backend.app.models.handwriting import AIProviderType
from .base import HandwritingAIProvider
from .providers import LocalOCRProvider, CloudAIProvider, FallbackProvider


def get_handwriting_provider(
    requested_provider: Optional[AIProviderType] = None,
    ai_enhanced: bool = False
) -> HandwritingAIProvider:
    """
    Factory function resolving the appropriate HandwritingAIProvider.
    Ensures safe graceful fallback and honors user privacy selection.
    """
    if requested_provider == AIProviderType.LOCAL or requested_provider == AIProviderType.TESSERACT:
        return LocalOCRProvider()

    if requested_provider == AIProviderType.GEMINI or (ai_enhanced and settings.AI_API_KEY):
        return FallbackProvider(
            primary=CloudAIProvider(),
            fallback=LocalOCRProvider()
        )

    # Global configured provider
    configured = (settings.AI_PROVIDER or "local").lower()
    if configured in ("gemini", "openai", "anthropic") and settings.AI_API_KEY:
        return FallbackProvider(
            primary=CloudAIProvider(),
            fallback=LocalOCRProvider()
        )

    return LocalOCRProvider()
