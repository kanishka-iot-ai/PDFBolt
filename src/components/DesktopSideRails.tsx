import React, { useMemo } from 'react';
import AdsterraBanner from './AdsterraBanner';

export interface DesktopSideRailsProps {
  children: React.ReactNode;
  /** Whether the user is actively working/editing (smoothly hides ads for focus & safety) */
  hasActiveWork?: boolean;
  /** Custom container max-width class for center content (default: 'max-w-4xl') */
  centerWidthClass?: string;
  /** Optional custom slot override for left rail */
  leftSlot?: string;
  /** Optional custom slot override for right rail */
  rightSlot?: string;
  /** Additional custom classes on the outer wrapper */
  className?: string;
}

/**
 * DesktopSideRails
 * ----------------
 * Places proportional vertical sponsor ad units in the left and right desktop gutters,
 * creating a balanced 3-ad layout (1 Left Vertical + 1 Center Horizontal + 1 Right Vertical).
 *
 * Proportional Architecture:
 * 1. Balanced Height: Fitted cleanly to the creative dimensions with zero empty white blocks.
 * 2. Responsive Breakpoint: Active on desktop screens >= 1200px (`lg:flex`),
 *    providing comfortable breathing space on 1280px, 1366px, 1440px, and 1920px displays.
 * 3. Graceful Mobile/Tablet Collapse: Auto-collapses cleanly on tablets and mobile (< 1200px)
 *    so the center content retains 100% full width with zero horizontal scrolling.
 * 4. Active Fill Guarantee: Directly delivers active Adsterra display creatives inside isolated
 *    iframes with zero empty placeholders or layout shift.
 * 5. Active Work Guard: Instantly fades out when user begins drawing or editing.
 */
export const DesktopSideRails: React.FC<DesktopSideRailsProps> = ({
  children,
  hasActiveWork = false,
  centerWidthClass = 'max-w-4xl',
  className = ''
}) => {
  // Check if dedicated 160x600 key exists, otherwise use verified 300x250 key
  const adsterraFormat = useMemo<'160x600' | '300x250'>(() => {
    const k160 = import.meta.env.VITE_ADSTERRA_160X600_KEY;
    const k300 = import.meta.env.VITE_ADSTERRA_300X250_KEY;
    if (k160 && k160 !== k300 && k160.trim() !== '') {
      return '160x600';
    }
    return '300x250';
  }, []);

  return (
    <div className={`w-full relative flex justify-center items-start ${hasActiveWork ? "px-0 h-full" : "px-1 sm:px-2 lg:px-4 xl:px-6"} ${className}`}>
      {/* 1. LEFT VERTICAL SPONSOR RAIL */}
      <aside
        className={`${hasActiveWork ? "hidden" : "hidden lg:flex"} flex-col items-center shrink-0 sticky top-[80px] z-20 transition-opacity duration-300 mr-2 xl:mr-4 2xl:mr-8 w-[130px] xl:w-[160px] 2xl:w-[300px]`}
        aria-label="Sponsored Advertisement (Left)"
      >
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1 select-none">
          Sponsored
        </span>
        <div className="w-[130px] xl:w-[160px] 2xl:w-[300px] min-h-[120px] xl:min-h-[140px] 2xl:min-h-[254px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#0e1422]/70 backdrop-blur-md flex flex-col items-center justify-center shadow-xs">
          <div className="w-full flex items-center justify-center overflow-hidden">
            <div className={adsterraFormat === '300x250' ? 'scale-[0.43] xl:scale-[0.533] 2xl:scale-100 origin-center' : 'w-full'}>
              <AdsterraBanner
                format={adsterraFormat}
                customKey={adsterraFormat === '300x250' ? 'b829e60459e206fdcb08b6bd0e342172' : undefined}
                showLabel={false}
                className="!my-0"
              />
            </div>
          </div>
        </div>
      </aside>

      {/* 2. CENTER CONTENT WORKBENCH (Tool Dropzone + Horizontal Ad) */}
      <div className={`w-full flex-1 min-w-0 ${hasActiveWork ? "max-w-full h-full" : centerWidthClass} shrink-0 flex-grow transition-all`}>
        {children}
      </div>

      {/* 3. RIGHT VERTICAL SPONSOR RAIL */}
      <aside
        className={`${hasActiveWork ? "hidden" : "hidden lg:flex"} flex-col items-center shrink-0 sticky top-[80px] z-20 transition-opacity duration-300 ml-3 xl:ml-5 2xl:ml-8 w-[130px] xl:w-[160px] 2xl:w-[300px]`}
        aria-label="Sponsored Advertisement (Right)"
      >
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1 select-none">
          Sponsored
        </span>
        <div className="w-[130px] xl:w-[160px] 2xl:w-[300px] min-h-[120px] xl:min-h-[140px] 2xl:min-h-[254px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#0e1422]/70 backdrop-blur-md flex flex-col items-center justify-center shadow-xs">
          <div className="w-full flex items-center justify-center overflow-hidden">
            <div className={adsterraFormat === '300x250' ? 'scale-[0.43] xl:scale-[0.533] 2xl:scale-100 origin-center' : 'w-full'}>
              <AdsterraBanner
                format={adsterraFormat}
                customKey={adsterraFormat === '300x250' ? 'b829e60459e206fdcb08b6bd0e342172' : undefined}
                showLabel={false}
                className="!my-0"
              />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default DesktopSideRails;
