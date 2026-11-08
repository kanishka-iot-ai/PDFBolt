import React from 'react';
import { Star, ShieldCheck, Cpu, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TrustMicroAnchorProps {
  toolId?: string;
  toolTitle?: string;
  className?: string;
}

export const TrustMicroAnchor: React.FC<TrustMicroAnchorProps> = ({
  toolId,
  toolTitle,
  className = ''
}) => {
  const reviewsUrl = toolTitle
    ? `/reviews/?tool=${encodeURIComponent(toolTitle)}`
    : toolId
    ? `/reviews/?tool=${encodeURIComponent(toolId)}`
    : '/reviews/';

  return (
    <div className={`inline-flex flex-wrap items-center justify-center gap-2 select-none ${className}`}>
      {/* 1. Interactive Review Rating Button */}
      <Link
        to={reviewsUrl}
        title="Rated 4.9/5 based on 1,420+ verified community reviews. Click to read reviews or submit your rating."
        aria-label="Rated 4.9 out of 5 stars based on 1,420+ reviews. Open community reviews page."
        className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] bg-white/90 dark:bg-slate-800/90 hover:bg-amber-500/10 dark:hover:bg-amber-400/10 border-slate-200/90 dark:border-white/10 hover:border-amber-500/40 text-slate-700 dark:text-slate-200 shadow-2xs backdrop-blur-md cursor-pointer"
      >
        <div className="flex items-center text-amber-400 group-hover:text-amber-500 transition-colors">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={11} fill="currentColor" className="text-amber-400" />
          ))}
        </div>
        <span className="font-extrabold text-slate-900 dark:text-white">4.9/5</span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">(1,420+)</span>
        <span className="text-amber-600 dark:text-amber-400 font-bold ml-0.5 inline-flex items-center gap-0.5 group-hover:underline">
          Reviews <ArrowUpRight size={11} />
        </span>
      </Link>

      {/* 2. Security & Memory Badges */}
      <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-medium backdrop-blur-md bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
          <Cpu size={12} className="text-amber-600 dark:text-amber-400" /> WebAssembly RAM
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
          <ShieldCheck size={12} /> 0 KB Uploaded
        </span>
      </div>
    </div>
  );
};

export default TrustMicroAnchor;
