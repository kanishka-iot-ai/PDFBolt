import React from 'react';
import { Link } from 'react-router-dom';
import { ToolMetadata } from '../types';
import { getIcon } from '../constants';
import { ArrowUpRight, Star } from 'lucide-react';

const getCategoryStyles = (category: string, darkMode: boolean) => {
  if (darkMode) {
    switch (category) {
      case 'edit': return 'group-hover:bg-red-900/10 group-hover:border-red-500/30';
      case 'convert-to': return 'group-hover:bg-blue-900/10 group-hover:border-blue-500/30';
      case 'convert-from': return 'group-hover:bg-green-900/10 group-hover:border-green-500/30';
      case 'security': return 'group-hover:bg-orange-900/10 group-hover:border-orange-500/30';
      case 'utilities':
      case 'extra': return 'group-hover:bg-slate-800 group-hover:border-slate-500/30';
      default: return 'group-hover:bg-slate-800 group-hover:border-slate-500/30';
    }
  } else {
    switch (category) {
      case 'edit': return 'group-hover:bg-red-50 group-hover:border-red-200';
      case 'convert-to': return 'group-hover:bg-blue-50 group-hover:border-blue-200';
      case 'convert-from': return 'group-hover:bg-green-50 group-hover:border-green-200';
      case 'security': return 'group-hover:bg-orange-50 group-hover:border-orange-200';
      case 'utilities':
      case 'extra': return 'group-hover:bg-slate-50 group-hover:border-slate-300';
      default: return 'group-hover:bg-slate-50 group-hover:border-slate-300';
    }
  }
};

const getIconStyles = (category: string) => {
  switch (category) {
    case 'edit': return 'text-red-500 bg-red-100 dark:bg-red-500/20';
    case 'convert-to': return 'text-blue-500 bg-blue-100 dark:bg-blue-500/20';
    case 'convert-from': return 'text-green-500 bg-green-100 dark:bg-green-500/20';
    case 'security': return 'text-orange-500 bg-orange-100 dark:bg-orange-500/20';
    case 'utilities':
    case 'extra': return 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700';
    default: return 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700';
  }
};

const ToolCard: React.FC<{ tool: ToolMetadata; darkMode: boolean }> = ({ tool, darkMode }) => {
  const isCore = ['merge', 'split', 'compress'].includes(tool.id);
  const categoryStyle = getCategoryStyles(tool.category, darkMode);
  const iconStyle = getIconStyles(tool.category);

  return (
    <Link
      to={tool.path}
      className="block h-full group outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 rounded-2xl"
    >
      <div className={`pdf-card p-6 flex flex-col justify-between rounded-2xl transition-all duration-300 ${categoryStyle} ${darkMode
        ? `bg-slate-900/80 border border-slate-800`
        : `bg-white border border-slate-100 shadow-md`
        }`}>

        <div className="relative z-10 w-full flex flex-col h-full">
          <div className="flex justify-between items-start mb-5">
            {/* Icon */}
            <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 ${iconStyle}`}>
              {React.cloneElement(getIcon(tool.icon) as React.ReactElement, { className: 'w-6 h-6' })}
            </div>

            {/* Arrow */}
            <div className={`p-1.5 rounded-full opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300 ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900'}`}>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-grow">
            {/* Title */}
            <h3 className={`text-lg font-black mb-2 transition-colors ${darkMode ? 'text-white group-hover:text-yellow-400' : 'text-slate-900 group-hover:text-yellow-600'}`}>
              {tool.title}
            </h3>

            {/* Description */}
            <p className={`text-xs font-medium leading-relaxed line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {tool.description}
            </p>
          </div>

          {/* Core Badge */}
          {isCore && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/50">
              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${darkMode ? 'bg-yellow-500/10 text-yellow-500' : 'bg-yellow-50 text-yellow-600'}`}>
                <Star size={10} className="fill-current" /> Core Feature
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ToolCard;
