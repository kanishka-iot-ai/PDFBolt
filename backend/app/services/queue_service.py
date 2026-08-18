import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from backend.app.core.logging import logger


class QueueService(ABC):
    """Abstract interface for background asynchronous job queueing."""

    @abstractmethod
    async def enqueue(self, job: Dict[str, Any]) -> str:
        pass

    @abstractmethod
    async def get(self) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def ack(self, job_id: str) -> None:
        pass

    @abstractmethod
    async def retry(self, job_id: str) -> None:
        pass

    @abstractmethod
    async def dead_letter(self, job_id: str, reason: str) -> None:
        pass


class LocalQueueService(QueueService):
    """In-process asyncio.Queue implementation. Works everywhere without external brokers."""

    def __init__(self, maxsize: int = 1000):
        self._queue: asyncio.Queue = asyncio.Queue(maxsize=maxsize)
        self._inflight: Dict[str, Dict[str, Any]] = {}

    async def enqueue(self, job: Dict[str, Any]) -> str:
        job_id = job.get("job_id", "")
        await self._queue.put(job)
        return job_id

    async def get(self) -> Optional[Dict[str, Any]]:
        try:
            job = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            job_id = job.get("job_id", "")
            if job_id:
                self._inflight[job_id] = job
            return job
        except asyncio.TimeoutError:
            return None

    async def ack(self, job_id: str) -> None:
        if job_id in self._inflight:
            del self._inflight[job_id]
            self._queue.task_done()

    async def retry(self, job_id: str) -> None:
        job = self._inflight.pop(job_id, None)
        if job:
            await self._queue.put(job)
            self._queue.task_done()

    async def dead_letter(self, job_id: str, reason: str) -> None:
        job = self._inflight.pop(job_id, None)
        if job:
            logger.error(f"Job {job_id} moved to dead-letter: {reason}")
            self._queue.task_done()


def get_queue_service() -> QueueService:
    return LocalQueueService()


queue_service = get_queue_service()
