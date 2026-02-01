import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

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

    return (
        <div className={`w-full p-6 rounded-2xl border transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {isComplete ? (
                        <CheckCircle2 className="text-green-500 animate-bounce" size={24} />
                    ) : isError ? (
                        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                            <span className="text-white text-xs font-black">!</span>
                        </div>
                    ) : (
                        <Loader2 className="text-yellow-500 animate-spin" size={24} />
                    )}
                    <div>
                        <p className={`font-black text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {label || 'Processing...'}
                        </p>
                        {fileName && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                {fileName}
                            </p>
                        )}
                    </div>
                </div>
                <span className={`text-2xl font-black ${isComplete ? 'text-green-500' :
                        isError ? 'text-red-500' :
                            'text-yellow-500'
                    }`}>
                    {Math.round(progress)}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className={`w-full h-3 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'
                }`}>
                <div
                    className={`h-full transition-all duration-300 ease-out ${isComplete ? 'bg-green-500' :
                            isError ? 'bg-red-500' :
                                'bg-gradient-to-r from-yellow-500 to-orange-500'
                        }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>

            {/* Status Message */}
            {isComplete && (
                <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-3 flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    Processing complete! Ready to download.
                </p>
            )}
            {isError && (
                <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-3">
                    An error occurred during processing. Please try again.
                </p>
            )}
        </div>
    );
};

export default ProgressBar;
