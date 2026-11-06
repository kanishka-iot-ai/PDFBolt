import React from 'react';
import { CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export interface FileSizeComparisonBadgeProps {
  originalBytes?: number;
  outputBytes?: number;
  darkMode?: boolean;
  className?: string;
  isCompressed?: boolean;
}

export const FileSizeComparisonBadge: React.FC<FileSizeComparisonBadgeProps> = ({
  originalBytes,
  outputBytes,
  darkMode = false,
  className = '',
  isCompressed = false,
}) => {
  if (!outputBytes || outputBytes <= 0) return null;

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const deltaPct = originalBytes && originalBytes > 0
    ? Math.round(((originalBytes - outputBytes) / originalBytes) * 100)
    : null;

  return (
    <div className={`inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs transition-all ${
      darkMode 
        ? 'bg-slate-800/80 border-slate-700 text-slate-200' 
        : 'bg-white border-slate-200 text-slate-700 shadow-xs'
    } ${className}`}>
      {originalBytes && originalBytes > 0 && originalBytes !== outputBytes && (
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="font-medium text-[11px] uppercase tracking-wider">Original:</span>
          <span className="font-semibold">{formatBytes(originalBytes)}</span>
          <ArrowRight size={12} className="text-slate-400" />
        </div>
      )}

      <div className="flex items-center gap-1.5 font-bold">
        <span className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Output:</span>
        <span className="text-slate-900 dark:text-white">{formatBytes(outputBytes)}</span>
      </div>

      {deltaPct !== null && deltaPct > 0 ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
          <CheckCircle2 size={11} /> {deltaPct}% Smaller {isCompressed && '(Compressed)'}
        </span>
      ) : deltaPct !== null && deltaPct === 0 ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
          <ShieldCheck size={11} /> Exact Size Preserved
        </span>
      ) : deltaPct !== null && deltaPct < 0 ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
          Format Fidelity Retained
        </span>
      ) : null}
    </div>
  );
};

export default FileSizeComparisonBadge;
