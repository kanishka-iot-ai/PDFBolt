import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  darkMode: boolean;
  status?: 'processing' | 'complete' | 'error';
  fileName?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  darkMode,
  status = 'processing',
  fileName
}) => {
  const isComplete = progress >= 100 || status === 'complete';
  const isError = status === 'error';
  const [completeState, setCompleteState] = useState(false);

  useEffect(() => {
    if (isComplete) {
      setCompleteState(true);
    } else {
      setCompleteState(false);
    }
  }, [isComplete]);

  const pct = Math.round(Math.min(Math.max(progress, 0), 100));

  // Authentic Document Processing Stage Label
  const getStageLabel = () => {
    if (isComplete) return 'Processing Complete';
    if (isError) return 'Processing Halted';
    if (label) return label;
    if (pct < 25) return 'Reading document stream';
    if (pct < 55) return 'Parsing page objects';
    if (pct < 85) return 'Applying transformations';
    return 'Finalizing output';
  };

  const stageLabel = getStageLabel();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
        darkMode
          ? 'bg-slate-900/90 border-slate-700/80 shadow-md'
          : 'bg-white border-slate-200/90 shadow-sm'
      }`}
    >
      {/* Top Row: Status Icon + Stage Name + Percentage */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isComplete
                ? 'bg-emerald-500 text-white'
                : isError
                ? 'bg-red-500 text-white'
                : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
            }`}
          >
            {isComplete ? (
              <CheckCircle2 size={16} />
            ) : isError ? (
              <AlertCircle size={16} />
            ) : (
              <Loader2 size={15} className="animate-spin text-yellow-600 dark:text-yellow-400" />
            )}
          </div>

          <div className="min-w-0">
            <p className={`font-bold text-xs truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {stageLabel}
            </p>
            {fileName && (
              <p className="text-[10px] text-slate-400 truncate">
                {fileName}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span
            className={`text-sm sm:text-base font-black font-mono tracking-tight transition-colors ${
              isComplete
                ? 'text-emerald-500'
                : isError
                ? 'text-red-500'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Clean Single-Layer Progress Track */}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={stageLabel}
        className={`w-full h-2 rounded-full overflow-hidden ${
          darkMode ? 'bg-slate-800' : 'bg-slate-100'
        }`}
      >
        <div
          className={`h-full transition-all duration-300 ease-out rounded-full ${
            isComplete
              ? 'bg-emerald-500'
              : isError
              ? 'bg-red-500'
              : 'bg-yellow-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Processing Milestones Stepper */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-400">
        <span
          className={`flex items-center gap-1.5 ${
            pct >= 15 ? 'text-slate-700 dark:text-slate-200 font-bold' : ''
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              pct >= 15 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          />
          1. Ingest
        </span>
        <span
          className={`flex items-center gap-1.5 ${
            pct >= 45 ? 'text-slate-700 dark:text-slate-200 font-bold' : ''
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              pct >= 45 ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          />
          2. Parse
        </span>
        <span
          className={`flex items-center gap-1.5 ${
            pct >= 75 ? 'text-slate-700 dark:text-slate-200 font-bold' : ''
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              pct >= 75 ? 'bg-yellow-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          />
          3. Process
        </span>
        <span
          className={`flex items-center gap-1.5 ${
            isComplete ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isComplete ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          />
          4. Output
        </span>
      </div>
    </div>
  );
};

export default React.memo(ProgressBar);
