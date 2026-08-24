import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, FileSearch, Settings, Sparkles } from 'lucide-react';

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

    // Determine current step based on progress
    const currentStep = isComplete ? 3 : progress < 30 ? 1 : 2;

    const steps = [
        { num: 1, name: 'Analyzing', icon: <FileSearch size={14} /> },
        { num: 2, name: 'Processing', icon: <Settings size={14} /> },
        { num: 3, name: 'Complete', icon: <CheckCircle2 size={14} /> }
    ];

    return (
        <div className={`w-full p-6 rounded-2xl border transition-all duration-500 shadow-lg ${darkMode ? 'bg-slate-900/80 border-slate-700/50 shadow-slate-900/50' : 'bg-white border-slate-200 shadow-slate-200/50'
            } ${celebrate ? 'ring-2 ring-green-500 scale-[1.02]' : ''}`}>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                        isComplete ? 'bg-green-100 text-green-500 dark:bg-green-500/20' : 
                        isError ? 'bg-red-100 text-red-500 dark:bg-red-500/20' : 
                        'bg-yellow-100 text-yellow-500 dark:bg-yellow-500/20'
                    }`}>
                        {isComplete ? (
                            <Sparkles className={celebrate ? "animate-pulse" : ""} size={28} />
                        ) : isError ? (
                            <span className="text-xl font-black">!</span>
                        ) : (
                            <Loader2 className="animate-spin" size={28} />
                        )}
                    </div>
                    <div>
                        <p className={`font-black text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {label || (isComplete ? 'Ready!' : 'Processing...')}
                        </p>
                        {fileName && (
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                {fileName}
                            </p>
                        )}
                    </div>
                </div>
                <span className={`text-3xl font-black transition-colors duration-300 ${
                        isComplete ? 'text-green-500' :
                        isError ? 'text-red-500' :
                        'text-yellow-500'
                    }`}>
                    {Math.round(progress)}%
                </span>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-3 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -z-10 rounded-full"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-yellow-500 -z-10 rounded-full transition-all duration-500" style={{ width: `${isComplete ? 100 : (currentStep - 1) * 50}%` }}></div>
                
                {steps.map(step => {
                    const isPast = currentStep > step.num;
                    const isCurrent = currentStep === step.num;
                    
                    return (
                        <div key={step.num} className="flex flex-col items-center gap-1.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isComplete || isPast ? 'bg-green-500 border-green-500 text-white' : 
                                isCurrent ? 'bg-yellow-500 border-yellow-500 text-white shadow-lg shadow-yellow-500/30' : 
                                darkMode ? 'bg-slate-800 border-slate-600 text-slate-500' : 'bg-white border-slate-300 text-slate-400'
                            }`}>
                                {isComplete || isPast ? <CheckCircle2 size={16} /> : step.icon}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                isCurrent ? 'text-yellow-600 dark:text-yellow-400' :
                                isPast ? 'text-green-600 dark:text-green-400' :
                                darkMode ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                                {step.name}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Progress Bar */}
            <div
                role="progressbar"
                aria-valuenow={Math.round(Math.min(progress, 100))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label || 'Operation progress'}
                className={`w-full h-4 rounded-full overflow-hidden relative shadow-inner ${darkMode ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                <div
                    className={`h-full transition-all duration-500 ease-out relative ${
                            isComplete ? 'bg-green-500' :
                            isError ? 'bg-red-500' :
                            'bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500'
                        }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                >
                    {/* Shimmer effect */}
                    {!isComplete && !isError && (
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer"></div>
                    )}
                </div>
            </div>

            {/* Status Message */}
            {isComplete && (
                <div className={`flex items-center gap-2 mt-4 p-3 rounded-xl animate-slideUp ${darkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
                    <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                    <p className="text-sm text-green-700 dark:text-green-400 font-bold">
                        Processing complete! Your file is ready.
                    </p>
                </div>
            )}
            {isError && (
                <div className={`flex items-center gap-2 mt-4 p-3 rounded-xl animate-slideUp ${darkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
                    <span className="text-red-600 dark:text-red-400 font-black text-lg">!</span>
                    <p className="text-sm text-red-700 dark:text-red-400 font-bold">
                        An error occurred during processing. Please try again.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProgressBar;
