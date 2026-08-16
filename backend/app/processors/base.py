from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, Optional
from backend.app.validators.input_validator import InputValidator
from backend.app.validators.output_validator import OutputValidator


class BaseProcessor(ABC):
    """
    Common processor abstraction across all PDF document operations:
    validate_input -> analyze -> process -> validate_output -> calculate_metrics -> cleanup
    """
    def __init__(self, settings: Optional[Dict[str, Any]] = None):
        self.settings = settings or {}

    def validate_input(self, content: bytes, password: Optional[str] = None) -> Tuple[int, bool]:
        """Validates input payload size, magic bytes, and syntax."""
        return InputValidator.validate_pdf_structure(content, password)

    def validate_output(self, output_bytes: bytes, expected_pages: Optional[int] = None) -> int:
        """Validates output payload integrity and page counts."""
        return OutputValidator.validate_pdf_output(output_bytes, expected_pages)

    @abstractmethod
    def process(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        """
        Executes the document transformation.
        Returns (output_bytes, output_filename, metrics_dict).
        """
        pass

    def cleanup(self) -> None:
        """Frees any temporary file handles, buffers, or worker caches."""
        pass
