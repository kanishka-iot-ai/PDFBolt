import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, MessageSquare, X } from 'lucide-react';

interface PostDownloadFeedbackProps {
  toolName?: string;
  className?: string;
}

export const PostDownloadFeedback: React.FC<PostDownloadFeedbackProps> = ({
  toolName = 'PDF tool',
  className = ''
}) => {
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const lastFeedback = localStorage.getItem('pdfbolt_feedback_submitted');
      if (lastFeedback) {
        const timestamp = parseInt(lastFeedback, 10);
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          setDismissed(true);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  if (dismissed) return null;

  const handleQuickRate = (starCount: number) => {
    setRating(starCount);
    try {
      localStorage.setItem('pdfbolt_feedback_submitted', Date.now().toString());
      const existing = JSON.parse(localStorage.getItem('pdfbolt_local_ratings') || '[]');
      existing.push({
        rating: starCount,
        tool: toolName,
        date: new Date().toISOString()
      });
      localStorage.setItem('pdfbolt_local_ratings', JSON.stringify(existing));
    } catch {
      // Ignore storage errors
    }
    setSubmitted(true);
    setTimeout(() => {
      setDismissed(true);
    }, 2000);
  };

  return (
    <div
      className={`w-full max-w-md mx-auto mt-1.5 px-3 py-1 rounded-xl border text-left transition-all animate-fadeIn ${className} bg-slate-50/80 dark:bg-slate-900/80 border-slate-200/70 dark:border-white/10 shadow-2xs`}
    >
      {submitted ? (
        <div className="flex items-center justify-center gap-1.5 py-0.5 text-center animate-fadeIn text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          <CheckCircle2 size={13} />
          <span>Thank you for your feedback!</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <MessageSquare size={12} className="text-amber-500 shrink-0" />
            <span>Rate your result:</span>
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const isLit = (hoverRating !== null ? hoverRating : rating !== null ? rating : 0) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => handleQuickRate(star)}
                  className="p-0.5 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    size={14}
                    fill={isLit ? 'currentColor' : 'none'}
                    className={isLit ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}
                  />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
              aria-label="Dismiss feedback"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDownloadFeedback;
