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

const rawHost = (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)) || 'https://pdfbolt-api.onrender.com';
export const API_BASE_URL = rawHost.endsWith('/api/v1') 
  ? rawHost.replace(/\/$/, '') 
  : `${rawHost.replace(/\/$/, '')}/api/v1`;
const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

function resolveApiUrl(pathOrUrl?: string, fallback?: string): string {
  const value = pathOrUrl || fallback || '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/api/v1')) return `${API_ORIGIN}${value}`;
  if (value.startsWith('/')) return `${API_BASE_URL}${value}`;
  return value;
}

function formatHttpError(status: number, customMessage?: string): string {
  if (customMessage && customMessage.trim()) return customMessage;
  switch (status) {
    case 400: return 'Invalid file or parameters provided for this operation.';
    case 401:
    case 403: return 'Access denied. You do not have permission to execute this operation.';
    case 404: return 'Requested operation or processing resource was not found.';
    case 408: return 'Request timed out. Please try again with a smaller file or lighter settings.';
    case 413: return 'The uploaded file exceeds the maximum allowed size for server processing.';
    case 429: return 'Too many processing requests. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
    case 504: return 'Backend processing service is temporarily unavailable. Falling back to local engine.';
    default: return `Processing failed with status ${status}.`;
  }
}

class ApiClient {
  private baseUrl: string = API_BASE_URL;
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
        signal: AbortSignal.timeout(5000)
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
      const message = formatHttpError(response.status, errorData.error?.message);
      throw new Error(message);
    }

    const jobData = await response.json();
    const jobId = jobData.job_id;

    // Fetch output artifact
    const dlResponse = await fetch(resolveApiUrl(jobData.download_url, `/jobs/${jobId}/download`), {
      signal: AbortSignal.timeout(10000)
    });
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
   * Scans a PDF document for sensitive PII patterns via backend.
   */
  async scanPdfSensitive(file: File, customTerms: string[] = []): Promise<any[]> {
    const formData = new FormData();
    formData.append('file', file);
    if (customTerms.length > 0) {
      formData.append('custom_terms', JSON.stringify(customTerms));
    }

    const response = await fetch(`${this.baseUrl}/redact/scan`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(formatHttpError(response.status, errorData.error?.message));
    }

    const data = await response.json();
    return data.findings || [];
  }

  /**
   * Submits two files for differential comparison processing.
   */
  async submitCompareJob(fileA: File, fileB: File, settings: Record<string, any> = {}): Promise<BackendJobResult> {
    const formData = new FormData();
    formData.append('operation', 'compare');
    formData.append('settings', JSON.stringify(settings));
    formData.append('files', fileA);
    formData.append('files', fileB);

    const response = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(formatHttpError(response.status, errorData.error?.message));
    }

    const jobData = await response.json();
    const jobId = jobData.job_id;

    const dlResponse = await fetch(resolveApiUrl(jobData.download_url, `/jobs/${jobId}/download`), {
      signal: AbortSignal.timeout(10000)
    });
    if (!dlResponse.ok) {
      throw new Error("Failed to retrieve comparison report.");
    }

    const outputBlob = await dlResponse.blob();
    return {
      success: true,
      job_id: jobId,
      operation: 'compare',
      outputBlob,
      outputFilename: jobData.output?.filename || "comparison_report.pdf",
      metrics: jobData.metrics || {}
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
      throw new Error(formatHttpError(response.status, errorData.error?.message));
    }

    const jobData = await response.json();
    const jobId = jobData.job_id;

    const dlResponse = await fetch(resolveApiUrl(jobData.download_url, `/jobs/${jobId}/download`), {
      signal: AbortSignal.timeout(10000)
    });
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
      throw new Error(formatHttpError(response.status, err.error?.message));
    }

    return await response.json();
  }
}

export const apiClient = new ApiClient();
