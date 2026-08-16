import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { QualityCheckReport } from '../../types/handwriting';

interface QualityCheckBannerProps {
  report: QualityCheckReport;
  onNavigatePage: (index: number) => void;
  darkMode: boolean;
}

const QualityCheckBanner: React.FC<QualityCheckBannerProps> = ({
  report,
  onNavigatePage,
  darkMode
}) => {
  if (report.issues.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs animate-slideDown space-y-2">
      <div className="flex items-center gap-2 font-black">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
        <span>Pre-Generation Quality Audit Notice</span>
      </div>

      <ul className="space-y-1.5 pl-6 list-disc">
        {report.issues.map((issue, idx) => (
          <li key={idx}>
            <span>{issue.message} </span>
            <button
              type="button"
              onClick={() => onNavigatePage(issue.pageIndex)}
              className="font-bold underline hover:text-amber-600 dark:hover:text-amber-100 ml-1"
            >
              Jump to Page {issue.pageNumber}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QualityCheckBanner;
