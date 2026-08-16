/**
 * Production Telemetry & SEO/CWV Performance Monitoring
 * 
 * Captures Core Web Vitals (LCP, INP, CLS), client-side 404s,
 * and API errors without blocking user interaction.
 */

export interface MetricPayload {
  name: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType?: string;
}

export const reportPerformanceMetric = (metric: MetricPayload) => {
  if (typeof window === 'undefined') return;

  // Dispatch to Google Analytics 4 if available
  if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', 'web_vitals', {
      event_category: 'Web Vitals',
      event_label: metric.name,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_rating: metric.rating,
      non_interaction: true,
    });
  }

  // Development diagnostic logging
  if (import.meta.env.DEV) {
    console.debug(`[Core Web Vitals] ${metric.name}: ${metric.value} (${metric.rating})`);
  }
};

export const reportErrorEvent = (category: '404_NOT_FOUND' | '5XX_API_ERROR' | 'CANONICAL_MISMATCH', details: Record<string, any>) => {
  if (typeof window === 'undefined') return;

  if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', 'error_monitoring', {
      event_category: category,
      ...details,
      non_interaction: true
    });
  }

  if (import.meta.env.DEV) {
    console.warn(`[Monitoring] ${category}:`, details);
  }
};
