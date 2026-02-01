
import React from 'react';
import { Link } from 'react-router-dom';
import { ToolMetadata } from '../types';
import { getIcon } from '../constants';
import { ArrowUpRight } from 'lucide-react';

// Define color schemes for different tools
const getToolColors = (toolId: string) => {
  const colorMap: Record<string, { icon: string; gradient: string; iconBg: string }> = {
    'merge': { icon: 'bg-gradient-to-br from-red-500 to-pink-600', gradient: 'from-blue-900/80 via-blue-800/60 to-slate-900/90', iconBg: 'bg-red-500' },
    'split': { icon: 'bg-gradient-to-br from-blue-500 to-cyan-600', gradient: 'from-blue-900/80 via-indigo-800/60 to-slate-900/90', iconBg: 'bg-blue-500' },
    'compress': { icon: 'bg-gradient-to-br from-green-400 to-emerald-600', gradient: 'from-blue-800/70 via-cyan-800/50 to-slate-800/80', iconBg: 'bg-green-400' },
    'repair': { icon: 'bg-gradient-to-br from-yellow-500 to-orange-600', gradient: 'from-blue-900/80 via-purple-900/60 to-slate-900/90', iconBg: 'bg-yellow-500' },
    'organize': { icon: 'bg-gradient-to-br from-purple-500 to-violet-600', gradient: 'from-violet-900/80 via-purple-800/60 to-slate-900/90', iconBg: 'bg-purple-500' },
    'rotate': { icon: 'bg-gradient-to-br from-teal-500 to-cyan-600', gradient: 'from-teal-900/80 via-blue-800/60 to-slate-900/90', iconBg: 'bg-teal-500' },
    'watermark': { icon: 'bg-gradient-to-br from-indigo-500 to-blue-600', gradient: 'from-indigo-900/80 via-blue-800/60 to-slate-900/90', iconBg: 'bg-indigo-500' },
    'protect': { icon: 'bg-gradient-to-br from-amber-500 to-yellow-600', gradient: 'from-amber-900/80 via-orange-800/60 to-slate-900/90', iconBg: 'bg-amber-500' },
    'unlock': { icon: 'bg-gradient-to-br from-lime-500 to-green-600', gradient: 'from-lime-900/80 via-green-800/60 to-slate-900/90', iconBg: 'bg-lime-500' },
  };

  return colorMap[toolId] || {
    icon: 'bg-gradient-to-br from-slate-500 to-gray-600',
    gradient: 'from-slate-900/80 via-slate-800/60 to-slate-900/90',
    iconBg: 'bg-slate-500'
  };
};

const ToolCard: React.FC<{ tool: ToolMetadata; darkMode: boolean }> = ({ tool, darkMode }) => {
  const colors = getToolColors(tool.id);
  const isCore = ['merge', 'split', 'compress', 'repair'].includes(tool.id);

  return (
    <Link
      to={tool.path}
      className={`group relative p-8 rounded-[2.5rem] border border-white/10 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl overflow-hidden ${darkMode
          ? `bg-gradient-to-br ${colors.gradient} backdrop-blur-xl`
          : `bg-gradient-to-br from-slate-100 via-white to-slate-50 shadow-lg`
        }`}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className={`mb-6 inline-flex p-5 rounded-[1.25rem] ${colors.icon} shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <div className="text-white scale-110">{getIcon(tool.icon)}</div>
        </div>

        {/* Arrow Icon - Top Right */}
        <div className="absolute top-6 right-6 opacity-40 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
          <ArrowUpRight className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-slate-700'}`} />
        </div>

        {/* Title */}
        <h3 className={`text-2xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {tool.title}
        </h3>

        {/* Core Badge */}
        {isCore && (
          <div className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-2 ${darkMode
              ? 'bg-white/10 text-white/60 backdrop-blur-sm'
              : 'bg-slate-900/10 text-slate-600'
            }`}>
            CORE
          </div>
        )}
      </div>
    </Link>
  );
};

export default ToolCard;
