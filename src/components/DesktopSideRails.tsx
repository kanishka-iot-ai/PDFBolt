import React from 'react';
import AdSlot from './AdSlot';
import AdsterraBanner from './AdsterraBanner';

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
 * Key Architectural Behaviors:
 * 1. Zero CLS: Pre-allocated 160x600px CSS reservations with skeleton backgrounds.
 * 2. Breakpoint Guard: Strictly active only on viewports >= 1300px (`min-[1300px]:flex`).
 *    Completely hidden on tablets, mobile, and compact laptops.
 * 3. Short Display Guard: Auto-hides on displays with viewport height < 720px to prevent cropping.
 * 4. Zero Footer Collision: Nested inside the content flex container (`items-start`), so it
 *    stops scrolling cleanly at the bottom boundary of the tool workbench.
 * 5. Accidental Click Defense: Smoothly fades out (`opacity-0 pointer-events-none`) when
 *    `hasActiveWork` is true (e.g. during active PDF vector drawing or canvas editing).
 */
export const DesktopSideRails: React.FC<DesktopSideRailsProps> = ({
  children,
  hasActiveWork = false,
  centerWidthClass = 'max-w-4xl',
  leftSlot,
  rightSlot,
  className = ''
}) => {
  return (
    <div className={`w-full relative flex justify-center items-start px-2 sm:px-4 lg:px-6 ${className}`}>
      {/* 1. LEFT SKYSCRAPER RAIL */}
      <aside
        className={`hidden min-[1300px]:flex flex-col items-center shrink-0 sticky top-[88px] z-20 transition-opacity duration-300 mr-4 2xl:mr-8 [@media(max-height:720px)]:!hidden ${
          hasActiveWork ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ width: '160px', minHeight: '600px' }}
        aria-label="Sponsored Advertisement (Left)"
      >
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1 select-none">
          Sponsored
        </span>
        <div className="w-[160px] h-[600px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center shadow-xs">
          <AdSlot
            placement="TOOL_SIDE_RAIL_LEFT"
            slot={leftSlot}
            format="vertical"
            className="w-[160px] h-[600px] !my-0 !max-w-[160px]"
            showLabel={false}
          />
          <AdsterraBanner
            format="160x600"
            showLabel={false}
            className="w-[160px] h-[600px]"
          />
        </div>
      </aside>

      {/* 2. CENTER CONTENT WORKBENCH */}
      <div className={`w-full ${centerWidthClass} shrink-0 flex-grow transition-all`}>
        {children}
      </div>

      {/* 3. RIGHT SKYSCRAPER RAIL */}
      <aside
        className={`hidden min-[1300px]:flex flex-col items-center shrink-0 sticky top-[88px] z-20 transition-opacity duration-300 ml-4 2xl:ml-8 [@media(max-height:720px)]:!hidden ${
          hasActiveWork ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ width: '160px', minHeight: '600px' }}
        aria-label="Sponsored Advertisement (Right)"
      >
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1 select-none">
          Sponsored
        </span>
        <div className="w-[160px] h-[600px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center shadow-xs">
          <AdSlot
            placement="TOOL_SIDE_RAIL_RIGHT"
            slot={rightSlot}
            format="vertical"
            className="w-[160px] h-[600px] !my-0 !max-w-[160px]"
            showLabel={false}
          />
          <AdsterraBanner
            format="160x600"
            showLabel={false}
            className="w-[160px] h-[600px]"
          />
        </div>
      </aside>
    </div>
  );
};

export default DesktopSideRails;
