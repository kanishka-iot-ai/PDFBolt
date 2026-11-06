import React, { useMemo } from 'react';
import AdSlot from './AdSlot';
import AdsterraBanner from './AdsterraBanner';
import { isAdsEnabled, getAdSenseClient } from '../config/adsenseConfig';

export interface DesktopSideRailsProps {
  children: React.ReactNode;
  /** Whether the user is actively working/editing (smoothly hides ads for focus & safety) */
  hasActiveWork?: boolean;
  /** Custom container max-width class for center content (default: 'max-w-4xl') */
  centerWidthClass?: string;
  /** Optional custom AdSense slot override for left rail */
  leftSlot?: string;
  /** Optional custom AdSense slot override for right rail */
  rightSlot?: string;
  /** Additional custom classes on the outer wrapper */
  className?: string;
}

/**
 * DesktopSideRails
 * ----------------
 * Places non-intrusive 160x600 Sticky Wide Skyscraper ad units in the left and right
 * desktop gutters outside the central tool container.
 *
 * Professional UX & Monetization Architecture:
 * 1. Zero Empty White Box: Container is 100% borderless, transparent, and shadow-free.
 *    If an ad is blocked, unfilled, or missing, it collapses to pure natural whitespace.
 * 2. Breakpoint Calibration: Active strictly on wide displays (min-[1440px]) and tall displays
 *    (viewport height > 780px). Completely suppressed on standard 1366x768 laptops and tablets.
 * 3. Mutual Exclusivity: Flanks the tool without boxing it in. No hardcoded floating labels
 *    when ads are not loaded.
 * 4. Active Work Guard: Instantly fades out when user begins editing/interacting.
 */
export const DesktopSideRails: React.FC<DesktopSideRailsProps> = ({
  children,
  hasActiveWork = false,
  centerWidthClass = 'max-w-4xl',
  leftSlot,
  rightSlot,
  className = ''
}) => {
  // Check if rail ads are enabled & configured
  const hasRailAds = useMemo(() => {
    const hasAdSense = isAdsEnabled() && Boolean(getAdSenseClient());
    const hasAdsterra160x600 =
      import.meta.env.VITE_ADSTERRA_ENABLED !== 'false' &&
      Boolean(import.meta.env.VITE_ADSTERRA_160X600_KEY);
    return hasAdSense || hasAdsterra160x600;
  }, []);

  // If no 160x600 credentials exist across networks, render children cleanly without gutters
  if (!hasRailAds) {
    return (
      <div className={`w-full relative flex justify-center items-start px-2 sm:px-4 lg:px-6 ${className}`}>
        <div className={`w-full ${centerWidthClass} shrink-0 flex-grow transition-all`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full relative flex justify-center items-start px-2 sm:px-4 lg:px-6 2xl:px-8 ${className}`}>
      {/* 1. LEFT SKYSCRAPER RAIL */}
      <aside
        className={`hidden min-[1440px]:flex flex-col items-center shrink-0 sticky top-[80px] z-20 transition-opacity duration-300 mr-4 xl:mr-6 2xl:mr-10 [@media(max-height:780px)]:!hidden ${
          hasActiveWork ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ width: '160px', minHeight: '600px' }}
        aria-label="Sponsored Advertisement (Left)"
      >
        <div className="w-[160px] min-h-[600px] bg-transparent border-0 shadow-none flex flex-col items-center justify-start overflow-hidden">
          <AdSlot
            placement="TOOL_SIDE_RAIL_LEFT"
            slot={leftSlot}
            format="vertical"
            className="w-[160px] min-h-[600px] !my-0 !max-w-[160px]"
            showLabel={true}
          />
          <AdsterraBanner
            format="160x600"
            showLabel={true}
            className="w-[160px] min-h-[600px]"
          />
        </div>
      </aside>

      {/* 2. CENTER CONTENT WORKBENCH */}
      <div className={`w-full ${centerWidthClass} shrink-0 flex-grow transition-all`}>
        {children}
      </div>

      {/* 3. RIGHT SKYSCRAPER RAIL */}
      <aside
        className={`hidden min-[1440px]:flex flex-col items-center shrink-0 sticky top-[80px] z-20 transition-opacity duration-300 ml-4 xl:ml-6 2xl:ml-10 [@media(max-height:780px)]:!hidden ${
          hasActiveWork ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ width: '160px', minHeight: '600px' }}
        aria-label="Sponsored Advertisement (Right)"
      >
        <div className="w-[160px] min-h-[600px] bg-transparent border-0 shadow-none flex flex-col items-center justify-start overflow-hidden">
          <AdSlot
            placement="TOOL_SIDE_RAIL_RIGHT"
            slot={rightSlot}
            format="vertical"
            className="w-[160px] min-h-[600px] !my-0 !max-w-[160px]"
            showLabel={true}
          />
          <AdsterraBanner
            format="160x600"
            showLabel={true}
            className="w-[160px] min-h-[600px]"
          />
        </div>
      </aside>
    </div>
  );
};

export default DesktopSideRails;
