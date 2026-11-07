import React from 'react';
import { Star, ShieldCheck, Cpu } from 'lucide-react';

interface TrustMicroAnchorProps {
  className?: string;
}

export const TrustMicroAnchor: React.FC<TrustMicroAnchorProps> = ({ className = '' }) => {
  return (
    <div
      className={`inline-flex items-center flex-wrap gap-1.5 sm:gap-2 px-3 py-1 rounded-full border text-[11px] font-semibold backdrop-blur-md select-none transition-all ${className} bg-slate-100/90 dark:bg-slate-800/80 border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-slate-300`}
      title="Verified 100% Client-Side WebAssembly Processing"
    >
      <div className="flex items-center text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={12} fill="currentColor" className="text-amber-400" />
        ))}
      </div>
      <span className="font-extrabold text-slate-900 dark:text-white">4.9/5</span>
      <span className="text-slate-400 dark:text-slate-500">•</span>
      <span className="flex items-center gap-1 font-medium">
        <Cpu size={12} className="text-yellow-600 dark:text-yellow-400" /> WebAssembly RAM
      </span>
      <span className="text-slate-400 dark:text-slate-500">•</span>
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
        <ShieldCheck size={12} /> 0 KB Uploaded
      </span>
    </div>
  );
};

export default TrustMicroAnchor;
