"""
Google Cloud Pub/Sub Asynchronous Queue Service for PDFBolt.
Dispatches heavy document processing tasks (batch OCR, LibreOffice conversion, complex compression)
to Google Cloud Run worker instances using Application Default Credentials (ADC).
"""

import json
from typing import Dict, Any, Optional
from backend.app.config import settings
from backend.app.core.logging import logger


class PubSubQueueService:
    """
    Google Cloud Pub/Sub Queue Service.
    Produces messages into the configured topic for consumption by Cloud Run workers.
    """

    def __init__(self):
        self.project_id = getattr(settings, "GCS_PROJECT_ID", "")
        self.topic_id = getattr(settings, "PUBSUB_TOPIC_JOBS", "pdfbolt-jobs")
        self._publisher = None
        self._topic_path = None

    def _init_client(self):
        if self._publisher is None and self.project_id:
            try:
                from google.cloud import pubsub_v1
                self._publisher = pubsub_v1.PublisherClient()
                self._topic_path = self._publisher.topic_path(self.project_id, self.topic_id)
            except Exception as e:
                logger.warning(f"Pub/Sub client initialization skipped/failed: {str(e)}")
                self._publisher = None

    def publish_job(self, job_id: str, operation: str, payload: Dict[str, Any]) -> Optional[str]:
        """
        Publishes a document job message to the Google Cloud Pub/Sub topic.
        Returns the published message ID or None if in local fallback mode.
        """
        message_data = {
            "job_id": job_id,
            "operation": operation,
            "payload": payload,
            "gcs_bucket": settings.GCS_BUCKET_NAME,
            "input_path": f"jobs/{job_id}/input/",
            "output_path": f"jobs/{job_id}/output/"
        }

        self._init_client()
        if self._publisher and self._topic_path:
            try:
                data_bytes = json.dumps(message_data).encode("utf-8")
                future = self._publisher.publish(self._topic_path, data=data_bytes, job_id=job_id)
                msg_id = future.result(timeout=10.0)
                logger.info(f"Published job {job_id} to Pub/Sub topic {self.topic_id} (Message ID: {msg_id})")
                return str(msg_id)
            except Exception as e:
                logger.error(f"Failed to publish job {job_id} to Pub/Sub: {str(e)}")
                return None

        # Local development / in-process execution fallback
        logger.debug(f"Pub/Sub running in local in-process mode for job {job_id}")
        return f"local-queue-{job_id}"


pubsub_service = PubSubQueueService()
