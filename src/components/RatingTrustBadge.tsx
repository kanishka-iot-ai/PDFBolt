import React from 'react';
import { Star, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface RatingTrustBadgeProps {
  className?: string;
  onClickReviews?: () => void;
}

export const RatingTrustBadge: React.FC<RatingTrustBadgeProps> = ({ className = '', onClickReviews }) => {
  return (
    <div 
      onClick={onClickReviews}
      className={`inline-flex items-center flex-wrap gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md transition-all cursor-pointer select-none bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 ${className}`}
      title="Click to view verified community reviews"
    >
      <div className="flex items-center text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={13} fill="currentColor" className="text-amber-400" />
        ))}
      </div>
      <span className="font-black text-slate-800 dark:text-slate-100">4.9 / 5.0</span>
      <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
        · 1,420+ verified reviews
      </span>
      <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold ml-1">
        <ShieldCheck size={12} /> 100% Client-Side Privacy
      </span>
    </div>
  );
};

export default RatingTrustBadge;
