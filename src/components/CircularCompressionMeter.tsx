import React, { useEffect, useState } from 'react';
import { Download, Eye, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatFileSize } from '../utils/fileValidation';

export interface CircularCompressionMeterProps {
  originalBytes: number;
  compressedBytes: number;
  fileName: string;
  onDownload: (customFileName?: string) => void;
  onPreview?: () => void;
  onReset: () => void;
  darkMode: boolean;
  targetSizeHint?: string;
}

export const CircularCompressionMeter: React.FC<CircularCompressionMeterProps> = ({
  originalBytes,
  compressedBytes,
  fileName,
  onDownload,
  onPreview,
  onReset,
  darkMode,
  targetSizeHint
}) => {
  const [animatedPct, setAnimatedPct] = useState(0);
  const defaultOutputName = fileName.replace(/\.pdf$/i, '') + '_compressed.pdf';
  const [customName, setCustomName] = useState(defaultOutputName);

  const savedBytes = Math.max(0, originalBytes - compressedBytes);
  const targetPct = originalBytes > 0 ? Math.round((savedBytes / originalBytes) * 100) : 0;

  // Compact SVG Radial Ring Dimensions
  const radius = 38;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPct / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPct(targetPct);
    }, 100);
    return () => clearTimeout(timer);
  }, [targetPct]);

  const handleDownloadClick = () => {
    const trimmed = customName.trim();
    const finalName = trimmed.endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
    onDownload(finalName);
  };

  return (
    <div
      className={`w-full max-w-md mx-auto p-3 sm:p-4 rounded-2xl border text-center transition-all shadow-xs ${
        darkMode
          ? 'bg-[#0e1422]/95 border-white/[0.08]'
          : 'bg-white border-slate-200/90'
      }`}
    >
      {/* Top Completion Badge */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
          <CheckCircle2 size={12} />
          <span>Compression Finished</span>
        </div>

        {targetSizeHint && (
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
            <ShieldCheck size={11} />
            <span>Target: {targetSizeHint}</span>
          </div>
        )}
      </div>

      {/* Side-by-Side: Compact Radial Ring + Two-Pillar Metric Cards */}
      <div className="flex items-center justify-center gap-3.5 my-1.5">
        {/* Radial Donut Progress Ring */}
        <div className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className={`fill-none stroke-current ${darkMode ? 'text-slate-800' : 'text-slate-100'}`}
              strokeWidth={strokeWidth}
            />
            {/* Animated Savings Arc */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="fill-none stroke-emerald-500 transition-all duration-1000 ease-out"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          {/* Center Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-base sm:text-lg font-black font-mono tracking-tight text-slate-900 dark:text-white leading-none">
              -{animatedPct}%
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5 leading-none">
              Reduced
            </span>
          </div>
        </div>

        {/* Two-Pillar Metric Comparison Cards */}
        <div className="flex flex-col gap-1 text-left min-w-[170px] sm:min-w-[190px]">
          {/* Original */}
          <div
            className={`px-2.5 py-1 rounded-lg border text-left transition-colors ${
              darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              Original Size
            </span>
            <span className="text-xs font-bold text-slate-400 line-through leading-tight">
              {formatFileSize(originalBytes)}
            </span>
          </div>

          {/* Compressed */}
          <div
            className={`px-2.5 py-1 rounded-lg border text-left transition-colors ${
              darkMode
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider leading-tight text-emerald-600 dark:text-emerald-400">
              <span>Compressed</span>
              <span>Saved {formatFileSize(savedBytes)}</span>
            </div>
            <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {formatFileSize(compressedBytes)}
            </span>
          </div>
        </div>
      </div>

      {/* Inline File Rename Input */}
      <div className="mb-2 text-left">
        <label
          htmlFor="compressed-filename-input"
          className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5"
        >
          Output File Name
        </label>
        <input
          id="compressed-filename-input"
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:ring-2 focus:ring-yellow-500 outline-none transition-all ${
            darkMode
              ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500'
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
          }`}
        />
      </div>

      {/* Action Buttons - Compact Anti-Slop Layout */}
      <div className="space-y-1.5 w-full pt-0.5">
        <button
          type="button"
          onClick={handleDownloadClick}
          className="w-full py-2 sm:py-2.5 px-4 bg-[#e53935] hover:bg-[#d32f2f] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Download size={14} />
          <span>Download Compressed PDF ({formatFileSize(compressedBytes)})</span>
        </button>

        <div className="flex gap-2 w-full">
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                darkMode
                  ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Eye size={12} className="text-amber-500" />
              <span>Preview</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            className={`flex-1 py-1.5 px-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
              darkMode
                ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RefreshCw size={11} />
            <span>Compress another</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CircularCompressionMeter;
