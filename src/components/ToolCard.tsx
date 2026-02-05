
import React from 'react';
import { Link } from 'react-router-dom';
import { ToolMetadata } from '../types';
import { getIcon } from '../constants';
import { ArrowUpRight } from 'lucide-react';

// Define color schemes for different tools
// Define color schemes for different tools
const getToolColors = (toolId: string) => {
  const colorMap: Record<string, { icon: string; hoverBorder: string; glow: string; gradient: string }> = {
    'merge': {
      icon: 'bg-gradient-to-br from-red-500 to-pink-600',
      hoverBorder: 'group-hover:border-red-500/50',
      glow: 'bg-red-500',
      gradient: 'from-red-500 via-white to-red-500'
    },
    'split': {
      icon: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      hoverBorder: 'group-hover:border-blue-500/50',
      glow: 'bg-blue-500',
      gradient: 'from-blue-500 via-white to-blue-500'
    },
    'compress': {
      icon: 'bg-gradient-to-br from-green-400 to-emerald-600',
      hoverBorder: 'group-hover:border-green-500/50',
      glow: 'bg-green-400',
      gradient: 'from-green-400 via-white to-green-400'
    },
    'repair': {
      icon: 'bg-gradient-to-br from-yellow-500 to-orange-600',
      hoverBorder: 'group-hover:border-yellow-500/50',
      glow: 'bg-yellow-500',
      gradient: 'from-yellow-500 via-white to-yellow-500'
    },
    'organize': {
      icon: 'bg-gradient-to-br from-purple-500 to-violet-600',
      hoverBorder: 'group-hover:border-purple-500/50',
      glow: 'bg-purple-500',
      gradient: 'from-purple-500 via-white to-purple-500'
    },
    'rotate': {
      icon: 'bg-gradient-to-br from-teal-500 to-cyan-600',
      hoverBorder: 'group-hover:border-teal-500/50',
      glow: 'bg-teal-500',
      gradient: 'from-teal-500 via-white to-teal-500'
    },
    'watermark': {
      icon: 'bg-gradient-to-br from-indigo-500 to-blue-600',
      hoverBorder: 'group-hover:border-indigo-500/50',
      glow: 'bg-indigo-500',
      gradient: 'from-indigo-500 via-white to-indigo-500'
    },
    'protect': {
      icon: 'bg-gradient-to-br from-amber-500 to-yellow-600',
      hoverBorder: 'group-hover:border-amber-500/50',
      glow: 'bg-amber-500',
      gradient: 'from-amber-500 via-white to-amber-500'
    },
    'unlock': {
      icon: 'bg-gradient-to-br from-lime-500 to-green-600',
      hoverBorder: 'group-hover:border-lime-500/50',
      glow: 'bg-lime-500',
      gradient: 'from-lime-500 via-white to-lime-500'
    },
  };

  return colorMap[toolId] || {
    icon: 'bg-gradient-to-br from-slate-500 to-gray-600',
    hoverBorder: 'group-hover:border-slate-500/50',
    glow: 'bg-slate-500',
    gradient: 'from-slate-500 via-white to-slate-500'
  };
};

const ToolCard: React.FC<{ tool: ToolMetadata; darkMode: boolean }> = ({ tool, darkMode }) => {
  const colors = getToolColors(tool.id);
  const isCore = ['merge', 'split', 'compress', 'repair'].includes(tool.id);

  return (
    <Link
      to={tool.path}
      className={`group relative p-[2px] rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl h-full block overflow-hidden`}
    >
      {/* Moving Gradient Border Background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-[spin_3s_linear_infinite]`} style={{ width: '200%', height: '200%', left: '-50%', top: '-50%' }}></div>

      {/* Inner Card Content (Masks the center of the gradient) */}
      <div className={`relative h-full p-6 rounded-[22px] flex flex-col justify-between overflow-hidden z-10 ${darkMode
        ? `bg-slate-900 border-slate-700/50`
        : `bg-white border-white`
        }`}
      >
        {/* Subtle colorful glow on hover */}
        <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-[50px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${colors.glow}`}></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            {/* Icon - Smaller & Sleek */}
            <div className={`p-3.5 rounded-2xl ${colors.icon} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <div className="text-white scale-90">{getIcon(tool.icon)}</div>
            </div>

            {/* Arrow */}
            <ArrowUpRight className={`w-5 h-5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 ${darkMode ? 'text-white/50' : 'text-slate-400'}`} />
          </div>

          {/* Title - Compact */}
          <h3 className={`text-lg font-bold leading-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {tool.title}
          </h3>

          {/* Description - Added per user request */}
          <p className={`mt-2 text-[11px] leading-relaxed line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {tool.description}
          </p>

          {/* Core Badge - Minimalist */}
          {isCore && (
            <div className="mt-3">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${darkMode ? 'bg-white/5 text-white/40' : 'bg-slate-100 text-slate-400'}`}>
                Core
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ToolCard;
