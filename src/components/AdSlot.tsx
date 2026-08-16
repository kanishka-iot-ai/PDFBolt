import React, { useEffect, useRef } from 'react';
import { 
  AD_PLACEMENTS, 
  AdPlacementKey, 
  isAdsEnabled, 
  getAdSenseClient, 
  isAdTestMode 
} from '../config/adsenseConfig';

// Declare global adsbygoogle array on window
declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export interface AdSlotProps {
  placement: AdPlacementKey;
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  showLabel?: boolean;
  minHeight?: string | number;
}

/**
 * Production-ready Google AdSense Ad Slot Component.
 * - Prevents Cumulative Layout Shift (CLS) with responsive container reservations.
 * - Safely calls adsbygoogle.push() with React 18 StrictMode idempotency protection.
 * - Displays clear "Advertisement" labeling compliant with Google AdSense Webmaster policies.
 * - Gracefully falls back in development without firing invalid impressions or network errors.
 */
const AdSlot: React.FC<AdSlotProps> = ({
  placement,
  slot,
  format,
  responsive,
  className = '',
  style = {},
  showLabel = true,
  minHeight
}) => {
  const config = AD_PLACEMENTS[placement];
  const adsActive = isAdsEnabled();
  const clientId = getAdSenseClient();
  const adSlotId = slot || config?.defaultSlotId || '';
  const adFormat = format || config?.format || 'auto';
  const isResponsive = responsive ?? config?.responsive ?? true;
  const labelText = config?.label || 'Advertisement';

  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!adsActive || !clientId || !adSlotId || pushedRef.current) {
      return;
    }

    // Safely request ad fill
    try {
      if (typeof window !== 'undefined') {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        pushedRef.current = true;
      }
    } catch (err) {
      console.warn(`[PDFBolt AdSense] Error initializing ad slot ${placement}:`, err);
    }
  }, [adsActive, clientId, adSlotId, placement]);

  // If ads are disabled in development mode, show a clean dev placeholder
  if (!adsActive) {
    if (import.meta.env.DEV) {
      return (
        <div 
          className={`w-full max-w-5xl mx-auto my-6 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-center transition-all ${className}`}
          style={{ minHeight: minHeight || config?.minHeightDesktop || '90px', ...style }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
            {labelText} • Development Mode
          </p>
          <div className="flex flex-col items-center justify-center py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>📢 Placement: <strong className="text-yellow-600 dark:text-yellow-400">{config?.name || placement}</strong></span>
            <span className="text-[10px] font-normal text-slate-400 mt-0.5">Real ads disabled. Set VITE_ADS_ENABLED=true and VITE_ADSENSE_CLIENT in .env to activate.</span>
          </div>
        </div>
      );
    }
    // In production when ads are disabled, collapse cleanly without blank spaces
    return null;
  }

  // Active production AdSense slot
  return (
    <aside 
      className={`ad-container w-full max-w-5xl mx-auto my-6 overflow-hidden text-center transition-all ${className}`}
      aria-label="Advertisement"
      style={{
        minHeight: minHeight || config?.minHeightDesktop || '90px',
        ...style
      }}
    >
      {showLabel && (
        <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-1 text-center select-none">
          {labelText}
        </span>
      )}
      
      <div className="w-full flex justify-center items-center">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'center',
            ...style
          }}
          data-ad-client={clientId}
          data-ad-slot={adSlotId}
          data-ad-format={adFormat}
          data-full-width-responsive={isResponsive ? 'true' : 'false'}
          data-adtest={isAdTestMode() ? 'on' : undefined}
        />
      </div>
    </aside>
  );
};

export default React.memo(AdSlot);
