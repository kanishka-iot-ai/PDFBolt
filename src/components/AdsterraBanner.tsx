import React, { useMemo } from 'react';

export type AdsterraFormat = '728x90' | '300x250' | '468x60' | '160x600' | '320x50' | 'responsive';

export interface AdsterraBannerProps {
  format?: AdsterraFormat;
  customKey?: string;
  className?: string;
  style?: React.CSSProperties;
  showLabel?: boolean;
}

interface FormatDimensions {
  width: number;
  height: number;
  envKeyName: string;
}

const FORMAT_CONFIG: Record<Exclude<AdsterraFormat, 'responsive'>, FormatDimensions> = {
  '728x90': {
    width: 728,
    height: 90,
    envKeyName: 'VITE_ADSTERRA_728X90_KEY',
  },
  '300x250': {
    width: 300,
    height: 250,
    envKeyName: 'VITE_ADSTERRA_300X250_KEY',
  },
  '468x60': {
    width: 468,
    height: 60,
    envKeyName: 'VITE_ADSTERRA_468X60_KEY',
  },
  '160x600': {
    width: 160,
    height: 600,
    envKeyName: 'VITE_ADSTERRA_160X600_KEY',
  },
  '320x50': {
    width: 320,
    height: 50,
    envKeyName: 'VITE_ADSTERRA_320X50_KEY',
  },
};

/**
 * Single isolated Adsterra Iframe Unit
 * Renders Adsterra atOptions script inside an isolated srcDoc iframe
 * to avoid global namespace collision on window.atOptions and prevent memory leaks in React SPAs.
 */
const AdsterraIframeSlot: React.FC<{
  width: number;
  height: number;
  adKey: string;
  scriptDomain: string;
  className?: string;
}> = ({ width, height, adKey, scriptDomain, className = '' }) => {
  const iframeSrcDoc = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <script type="text/javascript">
      atOptions = {
        'key' : '${adKey}',
        'format' : 'iframe',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    </script>
    <script type="text/javascript" src="//${scriptDomain}/${adKey}/invoke.js"></script>
  </body>
</html>`;
  }, [width, height, adKey, scriptDomain]);

  return (
    <div
      className={`overflow-hidden flex items-center justify-center ${className}`}
      style={{
        width: '100%',
        maxWidth: `${width}px`,
        height: `${height}px`,
        minHeight: `${height}px`,
      }}
    >
      <iframe
        title={`Advertisement ${width}x${height}`}
        srcDoc={iframeSrcDoc}
        width={width}
        height={height}
        scrolling="no"
        frameBorder="0"
        loading="lazy"
        className="border-0 overflow-hidden block mx-auto"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '100%',
        }}
      />
    </div>
  );
};

/**
 * Production-ready Adsterra Banner Ad Component:
 * - Pre-allocated container dimensions to strictly eliminate Cumulative Layout Shift (CLS).
 * - Sandboxed/isolated iframe preventing atOptions global collisions in React 18/19 SPAs.
 * - Supports responsive auto-switching (728x90 desktop / 300x250 mobile).
 * - Subtle styling matching PDFBolt's design system with discreet "Sponsored" pill.
 * - Collapses gracefully in production when keys are missing; displays helpful dev placeholder in dev mode.
 */
export const AdsterraBanner: React.FC<AdsterraBannerProps> = ({
  format = 'responsive',
  customKey,
  className = '',
  style = {},
  showLabel = true,
}) => {
  const isEnabled = import.meta.env.VITE_ADSTERRA_ENABLED !== 'false';
  const scriptDomain =
    import.meta.env.VITE_ADSTERRA_SCRIPT_DOMAIN || 'www.highperformanceformat.com';

  const desktopKey =
    customKey ||
    import.meta.env.VITE_ADSTERRA_728X90_KEY ||
    (format === '728x90' ? import.meta.env.VITE_ADSTERRA_BANNER_KEY : '');
  const mobileKey =
    customKey ||
    import.meta.env.VITE_ADSTERRA_300X250_KEY ||
    (format === '300x250' ? import.meta.env.VITE_ADSTERRA_BANNER_KEY : '');

  // Resolve single format key if non-responsive
  const singleKey = useMemo(() => {
    if (customKey) return customKey;
    if (format === 'responsive') return '';
    const cfg = FORMAT_CONFIG[format];
    return (import.meta.env[cfg.envKeyName] as string) || '';
  }, [format, customKey]);

  const hasAnyKey =
    format === 'responsive'
      ? Boolean(desktopKey || mobileKey)
      : Boolean(singleKey);

  // If ads are disabled or no keys provided
  if (!isEnabled || !hasAnyKey) {
    if (import.meta.env.DEV) {
      return (
        <aside
          className={`w-full max-w-4xl mx-auto my-6 px-4 py-3 rounded-2xl border-2 border-dashed border-amber-300/60 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20 text-center transition-all ${className}`}
          style={{
            minHeight: format === '300x250' ? '250px' : '90px',
            ...style,
          }}
          aria-label="Adsterra Placeholder"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
            Sponsored &bull; Adsterra Placeholder ({format})
          </span>
          <div className="flex flex-col items-center justify-center py-2 text-xs text-slate-600 dark:text-slate-400">
            <span>
              Key not detected for format{' '}
              <strong className="text-amber-600 dark:text-amber-300">{format}</strong>.
            </span>
            <span className="text-[10px] text-slate-500 mt-1">
              Add <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">VITE_ADSTERRA_728X90_KEY</code> or{' '}
              <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">VITE_ADSTERRA_300X250_KEY</code> in <code className="font-mono">.env</code> to activate live ads.
            </span>
          </div>
        </aside>
      );
    }
    // In production, gracefully collapse without any blank shifts
    return null;
  }

  return (
    <aside
      className={`adsterra-container w-full max-w-4xl mx-auto my-6 text-center select-none ${className}`}
      aria-label="Sponsored Content"
      style={style}
    >
      {showLabel && (
        <div className="flex items-center justify-center gap-1 mb-1.5">
          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
            Sponsored
          </span>
        </div>
      )}

      {format === 'responsive' ? (
        <div className="w-full flex justify-center items-center">
          {/* Desktop Leaderboard (728x90) */}
          {desktopKey ? (
            <div className="hidden md:flex justify-center w-full min-h-[90px]">
              <AdsterraIframeSlot
                width={728}
                height={90}
                adKey={desktopKey}
                scriptDomain={scriptDomain}
              />
            </div>
          ) : null}

          {/* Mobile Rectangle (300x250) or fallback */}
          {mobileKey ? (
            <div className="flex md:hidden justify-center w-full min-h-[250px]">
              <AdsterraIframeSlot
                width={300}
                height={250}
                adKey={mobileKey}
                scriptDomain={scriptDomain}
              />
            </div>
          ) : desktopKey ? (
            <div className="flex md:hidden justify-center w-full min-h-[90px] overflow-x-auto">
              <AdsterraIframeSlot
                width={728}
                height={90}
                adKey={desktopKey}
                scriptDomain={scriptDomain}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className="w-full flex justify-center items-center"
          style={{ minHeight: `${FORMAT_CONFIG[format].height}px` }}
        >
          <AdsterraIframeSlot
            width={FORMAT_CONFIG[format].width}
            height={FORMAT_CONFIG[format].height}
            adKey={singleKey}
            scriptDomain={scriptDomain}
          />
        </div>
      )}
    </aside>
  );
};

export default React.memo(AdsterraBanner);
