/**
 * Privacy-First Local Event Funnel Telemetry for PDFBolt
 * Stores aggregate metrics in localStorage with zero network transmission.
 */

export type FunnelEventType =
    | 'TOOL_OPENED'
    | 'FILE_SELECTED'
    | 'ANALYSIS_STARTED'
    | 'PROCESSING_STARTED'
    | 'DOWNLOAD_COMPLETED'
    | 'ERROR_OCCURRED';

export interface FunnelEvent {
    id: string;
    toolId: string;
    eventType: FunnelEventType;
    timestamp: number;
    fileCount?: number;
    totalSizeBytes?: number;
    errorCode?: string;
}

export interface ToolFunnelSummary {
    toolId: string;
    views: number;
    uploads: number;
    completions: number;
    errors: number;
    conversionRatePercent: number;
}

class AnalyticsService {
    private storageKey = 'pdfbolt_funnel_events';
    private maxEvents = 200;

    private getEvents(): FunnelEvent[] {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    private saveEvents(events: FunnelEvent[]) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(events.slice(-this.maxEvents)));
        } catch {
            // Local storage quota exceeded or disabled
        }
    }

    /**
     * Records a lifecycle step in the conversion funnel
     */
    trackEvent(
        toolId: string,
        eventType: FunnelEventType,
        meta?: { fileCount?: number; totalSizeBytes?: number; errorCode?: string }
    ) {
        const event: FunnelEvent = {
            id: Math.random().toString(36).substring(2, 9),
            toolId,
            eventType,
            timestamp: Date.now(),
            fileCount: meta?.fileCount,
            totalSizeBytes: meta?.totalSizeBytes,
            errorCode: meta?.errorCode
        };

        const events = this.getEvents();
        events.push(event);
        this.saveEvents(events);
    }

    /**
     * Calculates funnel summary conversion rates per tool
     */
    getFunnelSummaries(): Record<string, ToolFunnelSummary> {
        const events = this.getEvents();
        const summaries: Record<string, ToolFunnelSummary> = {};

        events.forEach(evt => {
            if (!summaries[evt.toolId]) {
                summaries[evt.toolId] = {
                    toolId: evt.toolId,
                    views: 0,
                    uploads: 0,
                    completions: 0,
                    errors: 0,
                    conversionRatePercent: 0
                };
            }

            const item = summaries[evt.toolId];
            if (evt.eventType === 'TOOL_OPENED') item.views += 1;
            if (evt.eventType === 'FILE_SELECTED') item.uploads += 1;
            if (evt.eventType === 'DOWNLOAD_COMPLETED') item.completions += 1;
            if (evt.eventType === 'ERROR_OCCURRED') item.errors += 1;
        });

        // Compute conversion rate (completions / uploads)
        Object.values(summaries).forEach(s => {
            s.conversionRatePercent = s.uploads > 0 ? Math.round((s.completions / s.uploads) * 100) : 100;
        });

        return summaries;
    }

    /**
     * Returns total files processed locally across lifetime
     */
    getTotalLifetimeStats(): { totalFiles: number; totalMB: number; successRate: number } {
        const events = this.getEvents();
        let totalFiles = 0;
        let totalBytes = 0;
        let completions = 0;
        let errors = 0;

        events.forEach(e => {
            if (e.fileCount) totalFiles += e.fileCount;
            if (e.totalSizeBytes) totalBytes += e.totalSizeBytes;
            if (e.eventType === 'DOWNLOAD_COMPLETED') completions += 1;
            if (e.eventType === 'ERROR_OCCURRED') errors += 1;
        });

        const totalAttempts = completions + errors;
        const successRate = totalAttempts > 0 ? Math.round((completions / totalAttempts) * 100) : 100;

        return {
            totalFiles: Math.max(totalFiles, completions),
            totalMB: Number((totalBytes / (1024 * 1024)).toFixed(1)),
            successRate
        };
    }
}

export const analyticsService = new AnalyticsService();
