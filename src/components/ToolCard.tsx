import React from 'react';
import { Link } from 'react-router-dom';
import { ToolMetadata } from '../types';
import { getIcon } from '../constants';
import { ArrowRight, Star } from 'lucide-react';

const getCategoryStyles = (category: string, darkMode: boolean) => {
  if (darkMode) {
    switch (category) {
      case 'edit': return 'hover:border-red-500/40 hover:bg-slate-900/90';
      case 'convert-to': return 'hover:border-blue-500/40 hover:bg-slate-900/90';
      case 'convert-from': return 'hover:border-green-500/40 hover:bg-slate-900/90';
      case 'security': return 'hover:border-orange-500/40 hover:bg-slate-900/90';
      case 'utilities':
      case 'extra': return 'hover:border-yellow-500/40 hover:bg-slate-900/90';
      default: return 'hover:border-yellow-500/40 hover:bg-slate-900/90';
    }
  } else {
    switch (category) {
      case 'edit': return 'hover:border-red-400 hover:shadow-lg hover:shadow-red-500/5';
      case 'convert-to': return 'hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5';
      case 'convert-from': return 'hover:border-green-400 hover:shadow-lg hover:shadow-green-500/5';
      case 'security': return 'hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/5';
      case 'utilities':
      case 'extra': return 'hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-500/5';
      default: return 'hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-500/5';
    }
  }
};

const getIconStyles = (category: string) => {
  switch (category) {
    case 'edit': return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'convert-to': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    case 'convert-from': return 'text-green-500 bg-green-500/10 border-green-500/20';
    case 'security': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    case 'utilities':
    case 'extra': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    default: return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
  }
};

interface ToolCardProps {
  tool: ToolMetadata;
  darkMode: boolean;
  compact?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, darkMode, compact = false }) => {
  const isCore = ['merge', 'split', 'compress'].includes(tool.id);
  const targetPath = tool.canonicalPath || tool.path;
  const categoryStyle = getCategoryStyles(tool.category, darkMode);
  const iconStyle = getIconStyles(tool.category);

  return (
    <Link
      to={targetPath}
      aria-label={`Open ${tool.title} tool: ${tool.description}`}
      className="block h-full group outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 rounded-2xl transition-transform duration-200 hover:-translate-y-1"
    >
      <div
        className={`h-full p-4 sm:p-5 md:p-6 flex flex-col justify-between rounded-2xl border transition-all duration-200 ${categoryStyle} ${
          darkMode
            ? 'bg-slate-900/70 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}
      >
        <div>
          {/* Header Row: Icon & Optional Core Badge */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className={`p-2.5 sm:p-3 rounded-xl border transition-transform duration-200 group-hover:scale-105 ${iconStyle}`}>
              {React.cloneElement(getIcon(tool.icon) as React.ReactElement, { className: 'w-5 h-5 sm:w-6 sm:h-6' })}
            </div>

            {isCore && !compact && (
              <span
                className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  darkMode ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                <Star size={10} className="fill-current" /> Core
              </span>
            )}
          </div>

          {/* Tool Title */}
          <h3
            className={`text-sm sm:text-base md:text-lg font-bold tracking-tight mb-1 sm:mb-1.5 transition-colors group-hover:text-yellow-500 line-clamp-1`}
          >
            {tool.title}
          </h3>

          {/* Benefit Description */}
          <p
            className={`text-xs leading-relaxed line-clamp-2 ${
              darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {tool.description}
          </p>
        </div>

        {/* CTA Row */}
        <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-yellow-600 dark:text-yellow-400 group-hover:text-yellow-500 inline-flex items-center gap-1">
            Open tool
            <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" />
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider hidden sm:inline">
            Free
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ToolCard;
