/**
 * Centralized API Client for PDFBolt Backend Engine (FastAPI /api/v1).
 * Features automatic health discovery and graceful local client-side fallback.
 */

export interface BackendHealth {
  isAvailable: boolean;
  version?: string;
  environment?: string;
}

export interface BackendJobMetrics {
  original_size_bytes: number;
  output_size_bytes: number;
  saved_bytes: number;
  reduction_percent: number;
  is_reduced: boolean;
  quality_status: string;
  notice?: string;
  [key: string]: any;
}

export interface BackendJobResult {
  success: boolean;
  job_id: string;
  operation: string;
  outputBlob: Blob;
  outputFilename: string;
  metrics: BackendJobMetrics;
}

class ApiClient {
  private baseUrl: string = '/api/v1';
  private backendAvailable: boolean | null = null;
  private lastHealthCheck: number = 0;

  /**
   * Checks if the FastAPI backend is online.
   * Caches result for 30 seconds to minimize network overhead.
   */
  async checkBackend(): Promise<boolean> {
    const now = Date.now();
    if (this.backendAvailable !== null && now - this.lastHealthCheck < 30000) {
      return this.backendAvailable;
    }

    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2500)
      });
      this.backendAvailable = res.ok;
    } catch {
      this.backendAvailable = false;
    }

    this.lastHealthCheck = now;
    return this.backendAvailable;
  }

  /**
   * Submits a single file processing job to the backend engine.
   */
  async submitJob(
    operation: string,
    file: File,
    settings: Record<string, any> = {}
  ): Promise<BackendJobResult> {
    const formData = new FormData();
    formData.append('operation', operation);
    formData.append('settings', JSON.stringify(settings));
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error?.message || `Backend processing failed with status ${response.status}`;
      throw new Error(message);
    }

    const jobData = await response.json();
    const jobId = jobData.job_id;

    // Fetch output artifact
    const dlResponse = await fetch(`${this.baseUrl}/jobs/${jobId}/download`);
    if (!dlResponse.ok) {
      throw new Error("Failed to download output artifact from backend storage.");
    }

    const outputBlob = await dlResponse.blob();
    const outputFilename = jobData.output?.filename || `${operation}_result.pdf`;

    return {
      success: true,
      job_id: jobId,
      operation,
      outputBlob,
      outputFilename,
      metrics: jobData.metrics || {
        original_size_bytes: file.size,
        output_size_bytes: outputBlob.size,
        saved_bytes: Math.max(0, file.size - outputBlob.size),
        reduction_percent: Number(((Math.max(0, file.size - outputBlob.size) / file.size) * 100).toFixed(2)),
        is_reduced: outputBlob.size < file.size,
        quality_status: "passed"
      }
    };
  }

  /**
   * Submits multiple files for merge processing.
   */
  async submitMergeJob(files: File[], settings: Record<string, any> = {}): Promise<BackendJobResult> {
    const formData = new FormData();
    formData.append('operation', 'merge');
    formData.append('settings', JSON.stringify(settings));
    for (const f of files) {
      formData.append('files', f);
    }

    const response = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Merge processing failed on backend.");
    }

    const jobData = await response.json();
    const jobId = jobData.job_id;

    const dlResponse = await fetch(`${this.baseUrl}/jobs/${jobId}/download`);
    if (!dlResponse.ok) {
      throw new Error("Failed to retrieve merged document.");
    }

    const outputBlob = await dlResponse.blob();
    return {
      success: true,
      job_id: jobId,
      operation: 'merge',
      outputBlob,
      outputFilename: jobData.output?.filename || "merged_document.pdf",
      metrics: jobData.metrics || {}
    };
  }

  /**
   * Sends a PDF document for deep structural analysis and topical breakdown.
   */
  async analyzePdf(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || "Document analysis failed.");
    }

    return await response.json();
  }
}

export const apiClient = new ApiClient();
