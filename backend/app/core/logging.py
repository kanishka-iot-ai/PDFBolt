import logging
import json
import time
import sys
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """
    Format logs as JSON objects without sensitive document contents.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage()
        }

        # Include extra structured fields if available
        if hasattr(record, "job_id"):
            log_data["job_id"] = getattr(record, "job_id")
        if hasattr(record, "operation"):
            log_data["operation"] = getattr(record, "operation")
        if hasattr(record, "input_size_bytes"):
            log_data["input_size_bytes"] = getattr(record, "input_size_bytes")
        if hasattr(record, "output_size_bytes"):
            log_data["output_size_bytes"] = getattr(record, "output_size_bytes")
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = getattr(record, "duration_ms")
        if hasattr(record, "error_code"):
            log_data["error_code"] = getattr(record, "error_code")

        return json.dumps(log_data)


def setup_logger(name: str = "pdfbolt") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)

    return logger


logger = setup_logger()
