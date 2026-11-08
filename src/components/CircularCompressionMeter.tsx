import React, { useEffect, useState } from 'react';
import { Download, Eye, RefreshCw, CheckCircle2, ShieldCheck, ArrowDown } from 'lucide-react';
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

  // SVG Radial Ring Dimensions
  const radius = 62;
  const strokeWidth = 10;
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
      className={`w-full max-w-md mx-auto p-4 sm:p-6 rounded-2xl border text-center transition-all shadow-sm ${
        darkMode
          ? 'bg-[#0e1422]/95 border-white/[0.08]'
          : 'bg-white border-slate-200/90'
      }`}
    >
      {/* Top Completion Badge */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <CheckCircle2 size={13} />
          <span>Compression Finished</span>
        </div>

        {targetSizeHint && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <ShieldCheck size={12} />
            <span>Target: {targetSizeHint}</span>
          </div>
        )}
      </div>

      {/* Radial Donut Progress Ring */}
      <div className="relative w-36 h-36 mx-auto my-1 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            className={`fill-none stroke-current ${darkMode ? 'text-slate-800' : 'text-slate-100'}`}
            strokeWidth={strokeWidth}
          />
          {/* Animated Savings Arc */}
          <circle
            cx="80"
            cy="80"
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
          <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
            -{animatedPct}%
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">
            File Reduced
          </span>
        </div>
      </div>

      {/* Two-Pillar Metric Comparison Cards */}
      <div className="grid grid-cols-2 gap-2.5 my-3.5">
        {/* Original */}
        <div
          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-colors ${
            darkMode ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Original Size
          </span>
          <span className="text-sm sm:text-base font-black text-slate-400 line-through">
            {formatFileSize(originalBytes)}
          </span>
        </div>

        {/* Compressed */}
        <div
          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-colors ${
            darkMode
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Compressed
            </span>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              Saved {formatFileSize(savedBytes)}
            </span>
          </div>
          <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
            {formatFileSize(compressedBytes)}
          </span>
        </div>
      </div>

      {/* Inline File Rename Input */}
      <div className="mb-5 text-left">
        <label
          htmlFor="compressed-filename-input"
          className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1"
        >
          Output File Name
        </label>
        <input
          id="compressed-filename-input"
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-yellow-500 outline-none transition-all ${
            darkMode
              ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500'
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
          }`}
        />
      </div>

      {/* Action Buttons - Compact Anti-Slop Layout */}
      <div className="space-y-2 w-full pt-1">
        <button
          type="button"
          onClick={handleDownloadClick}
          className="w-full py-2.5 sm:py-3 px-5 bg-[#e53935] hover:bg-[#d32f2f] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download size={15} />
          <span>Download Compressed PDF ({formatFileSize(compressedBytes)})</span>
        </button>

        <div className="flex gap-2 w-full">
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                darkMode
                  ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Eye size={13} className="text-amber-500" />
              <span>Preview Document</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              darkMode
                ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RefreshCw size={12} />
            <span>Compress another</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CircularCompressionMeter;
