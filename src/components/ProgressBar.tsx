import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Cpu } from 'lucide-react';

interface ProgressBarProps {
    progress: number; // 0-100
    label?: string;
    darkMode: boolean;
    status?: 'processing' | 'complete' | 'error';
    fileName?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
    progress,
    label,
    darkMode,
    status = 'processing',
    fileName
}) => {
    const isComplete = progress >= 100 || status === 'complete';
    const isError = status === 'error';
    const [celebrate, setCelebrate] = useState(false);

    useEffect(() => {
        if (isComplete) {
            setCelebrate(true);
            const timer = setTimeout(() => setCelebrate(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isComplete]);

    const pct = Math.round(Math.min(Math.max(progress, 0), 100));

    // Dynamic High-Tech Stage Label
    const stageLabel = isComplete 
        ? 'Verified & Ready' 
        : isError 
        ? 'Processing Alert' 
        : pct < 30 
        ? 'Analyzing Stream' 
        : pct < 70 
        ? 'Lightning Transformation' 
        : 'Finalizing Output';

    return (
        <div className={`w-full p-4 rounded-2xl border transition-all duration-300 shadow-md ${
            darkMode 
                ? 'bg-slate-900/90 border-slate-700/70 shadow-slate-950/60' 
                : 'bg-white border-slate-200/80 shadow-slate-200/50'
        } ${celebrate ? 'ring-2 ring-emerald-500 scale-[1.01]' : ''}`}>
            
            {/* Top Row: Mini Radar Badge + Title + Percentage */}
            <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center transition-all ${
                        isComplete 
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                            : isError 
                            ? 'bg-red-500 text-white' 
                            : 'bg-[#e53935] text-white shadow-md shadow-red-500/25 animate-pulse'
                    }`}>
                        {isComplete ? (
                            <Sparkles size={14} className={celebrate ? "animate-spin" : ""} />
                        ) : isError ? (
                            <span className="text-xs font-black">!</span>
                        ) : (
                            <Cpu size={14} className="animate-spin" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <Zap size={10} className="fill-current" />
                                {stageLabel}
                            </span>
                        </div>
                        <p className={`font-bold text-xs truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {label || (isComplete ? 'Execution Finished' : 'Processing Core')}
                        </p>
                    </div>
                </div>

                <div className="shrink-0 text-right">
                    <span className={`text-base font-black font-mono tracking-tight transition-colors ${
                        isComplete ? 'text-emerald-500' : isError ? 'text-red-500' : 'text-[#e53935]'
                    }`}>
                        {pct}%
                    </span>
                </div>
            </div>

            {/* Futuristic Slim Neon Bar */}
            <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label || 'Processing progress'}
                className={`w-full h-2 rounded-full overflow-hidden relative ${
                    darkMode ? 'bg-slate-800' : 'bg-slate-100'
                }`}
            >
                <div
                    className={`h-full transition-all duration-300 ease-out rounded-full relative ${
                        isComplete
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500'
                            : isError
                            ? 'bg-red-500'
                            : 'bg-gradient-to-r from-[#e53935] via-amber-400 to-[#e53935] bg-[length:200%_100%] animate-[shimmer_2s_infinite]'
                    }`}
                    style={{ width: `${pct}%` }}
                >
                    {!isComplete && !isError && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-shimmer"></div>
                    )}
                </div>
            </div>

            {/* Bottom Row: Micro Node Indicators */}
            <div className="flex items-center justify-between mt-2 pt-0.5 text-[9px] font-semibold text-slate-400">
                <span className={`flex items-center gap-1 ${pct >= 10 ? 'text-slate-700 dark:text-slate-200 font-bold' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pct >= 10 ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    1. Ingest
                </span>
                <span className={`flex items-center gap-1 ${pct >= 40 ? 'text-slate-700 dark:text-slate-200 font-bold' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pct >= 40 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    2. Transform
                </span>
                <span className={`flex items-center gap-1 ${isComplete ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    3. Output
                </span>
            </div>
        </div>
    );
};

export default React.memo(ProgressBar);
