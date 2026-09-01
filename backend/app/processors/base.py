import uuid
import time
import shutil
import tempfile
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Any, Optional, Union, Tuple
from backend.app.models.job import JobResult, JobStatus
from backend.app.core.logging import get_logger
from backend.app.core.errors import OutputValidationError, PDFBoltError
from backend.app.core.validation import validate_pdf_file, validate_output_file

logger = get_logger(__name__)


class BaseProcessor(ABC):
    """
    Master abstract processor base class.
    All PDF operations inherit from BaseProcessor and implement process().
    """

    operation: str = "base"
    input_formats: List[str] = [".pdf"]
    output_format: str = ".pdf"

    def __init__(
        self,
        job_id: Optional[Union[str, Dict[str, Any]]] = None,
        work_dir: Optional[Union[Path, str]] = None,
        settings: Optional[Dict[str, Any]] = None
    ):
        if isinstance(job_id, dict):
            settings = job_id
            job_id = None

        self.job_id = str(job_id or uuid.uuid4())
        self._is_temp_work_dir = False
        if work_dir is None:
            # Use RAM-disk on Linux (/dev/shm) for zero-disk-I/O intermediate files.
            # Falls back to default temp dir on Windows and macOS.
            import os as _os
            _ram_dir = "/dev/shm" if _os.path.isdir("/dev/shm") else None
            self.work_dir = Path(tempfile.mkdtemp(prefix="pdfbolt_proc_", dir=_ram_dir))
            self._is_temp_work_dir = True
        else:
            self.work_dir = Path(work_dir)

        self.settings = settings or {}

        self.input_dir = self.work_dir / "input"
        self.output_dir = self.work_dir / "output"
        self.temp_dir = self.work_dir / "temp"

        # Create all subdirectories in one pass
        for d in (self.input_dir, self.output_dir, self.temp_dir):
            d.mkdir(parents=True, exist_ok=True)


    def run(self, input_files: List[Path], options: Optional[Dict[str, Any]] = None) -> JobResult:
        """
        Master pipeline — called by job_service.
        NEVER override this method in subclasses. Override process() instead.
        """
        started_at = time.time()
        opts = options or self.settings or {}
        try:
            # Step 1: Validate all inputs
            for f in input_files:
                self._validate_input(f)

            # Step 2: Execute processor logic
            logger.info(f"processor.start job_id={self.job_id} op={self.operation} file_count={len(input_files)}")
            output_path = self.process(input_files, opts)

            # Step 3: Validate output BEFORE returning success
            self._validate_output(output_path)

            duration = round(time.time() - started_at, 3)
            out_size = output_path.stat().st_size if output_path.exists() else 0
            logger.info(f"processor.complete job_id={self.job_id} op={self.operation} duration={duration}s output_size={out_size}")

            return JobResult(
                job_id=self.job_id,
                status=JobStatus.COMPLETED,
                output_path=output_path,
                duration_s=duration,
                output_size=out_size
            )

        except OutputValidationError:
            raise
        except PDFBoltError:
            raise
        except Exception as e:
            logger.error(f"processor.failed job_id={self.job_id} op={self.operation} error={e}")
            raise PDFBoltError("PROCESSING_FAILED", str(e))

    @abstractmethod
    def process(self, input_files: Any, options: Any = None) -> Any:
        """
        Implement tool-specific logic here.
        Must return path to valid output file or bytes tuple when called in legacy mode.
        """
        pass

    def _validate_input(self, path: Path) -> None:
        """Validate file exists, is readable, magic bytes correct."""
        if not path.exists() or path.stat().st_size == 0:
            raise PDFBoltError("FILE_EMPTY")
        if self.operation == "repair":
            return
        if self.input_formats == [".pdf"]:
            validate_pdf_file(path)


    def _validate_output(self, path: Path) -> None:
        """Validate output file is real, correct, and non-empty."""
        validate_output_file(path, self.output_format)

    def cleanup(self) -> None:
        """Delete work directory. Called by cleanup service."""
        try:
            shutil.rmtree(self.work_dir, ignore_errors=True)
        except Exception:
            pass

    def _process_bytes_generic(self, content: bytes, filename: str) -> Tuple[bytes, str, Dict[str, Any]]:
        """Generic adapter for legacy byte-in/byte-out interface."""
        ext = Path(filename).suffix or ".pdf"
        temp_input = self.input_dir / f"input_{self.job_id}{ext}"
        with open(temp_input, "wb") as f:
            f.write(content)

        result = self.run([temp_input], self.settings)
        with open(result.output_path, "rb") as f:
            out_bytes = f.read()

        out_name = f"result_{self.job_id}{self.output_format}"
        metrics = {
            "original_size_bytes": len(content),
            "output_size_bytes": len(out_bytes),
            "duration_s": result.duration_s,
            "quality_status": "passed"
        }
        return out_bytes, out_name, metrics
