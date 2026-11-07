import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, MessageSquare, ThumbsUp, X } from 'lucide-react';

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
  const [useCase, setUseCase] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if user already submitted feedback recently
    try {
      const lastFeedback = localStorage.getItem('pdfbolt_feedback_submitted');
      if (lastFeedback) {
        const timestamp = parseInt(lastFeedback, 10);
        // Only show once every 7 days
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          setDismissed(true);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  if (dismissed) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('pdfbolt_feedback_submitted', Date.now().toString());
      // Save rating entry locally
      const existing = JSON.parse(localStorage.getItem('pdfbolt_local_ratings') || '[]');
      existing.push({
        rating: rating || 5,
        tool: toolName,
        useCase: useCase || 'General',
        comment: comment.trim(),
        date: new Date().toISOString()
      });
      localStorage.setItem('pdfbolt_local_ratings', JSON.stringify(existing));
    } catch {
      // Ignore storage errors
    }

    setSubmitted(true);
    setTimeout(() => {
      setDismissed(true);
    }, 2500);
  };

  const USE_CASES = [
    'UPSC / Exam Portal',
    'Aadhaar / KYC Masking',
    'Job Application',
    'College Assignment',
    'Legal / Business'
  ];

  return (
    <div
      className={`w-full max-w-lg mx-auto mt-4 p-4 rounded-2xl border text-left transition-all animate-fadeIn ${className} bg-slate-50/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-white/10 shadow-sm`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
          <MessageSquare size={14} className="text-yellow-500" />
          <span>Quick Feedback</span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1"
          aria-label="Dismiss feedback"
        >
          <X size={14} />
        </button>
      </div>

      {submitted ? (
        <div className="py-4 text-center animate-fadeIn">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={18} />
          </div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            Thank you for helping keep PDFBolt fast, free, and private!
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              How was your experience?
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => {
                const isLit = (hoverRating !== null ? hoverRating : rating !== null ? rating : 0) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      size={18}
                      fill={isLit ? 'currentColor' : 'none'}
                      className={isLit ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {rating !== null && (
            <div className="space-y-2.5 pt-2 border-t border-slate-200/50 dark:border-white/5 animate-fadeIn">
              <div>
                <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  What did you use this for today?
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {USE_CASES.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setUseCase(item)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        useCase === item
                          ? 'bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 border border-yellow-500/40 font-bold'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-slate-300'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder={rating >= 4 ? "Optional comment or suggestion..." : "What went wrong? We'll fix it immediately..."}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-xs hover:shadow transition-all cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default PostDownloadFeedback;
