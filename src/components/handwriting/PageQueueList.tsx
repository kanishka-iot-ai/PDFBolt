import React, { useState } from 'react';
import {
  Trash2, RotateCw, ArrowUp, ArrowDown, Eye, CheckCircle2,
  AlertTriangle, Camera, Upload, Layers, GripVertical, Sparkles
} from 'lucide-react';
import { HandwritingPage } from '../../types/handwriting';

interface PageQueueListProps {
  pages: HandwritingPage[];
  onReorder: (newPages: HandwritingPage[]) => void;
  onDeletePage: (id: string) => void;
  onRotatePage: (id: string) => void;
  onToggleView: (id: string) => void;
  onOpenUpload: () => void;
  onOpenCamera: () => void;
  darkMode: boolean;
}

const PageQueueList: React.FC<PageQueueListProps> = ({
  pages,
  onReorder,
  onDeletePage,
  onRotatePage,
  onToggleView,
  onOpenUpload,
  onOpenCamera,
  darkMode
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onReorder(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    movePage(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* Queue Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Document Queue ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Drag to reorder pages or use camera/upload to add more
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCamera}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <Camera size={15} /> Add Camera Photo
          </button>
          <button
            onClick={onOpenUpload}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <Upload size={15} /> Upload More
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {pages.map((page, index) => {
          const displayImage = page.activeView === 'enhanced' ? page.enhancedImage : page.originalImage;

          return (
            <div
              key={page.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-2xl border p-3.5 flex flex-col justify-between transition-all duration-200 ${
                draggedIndex === index
                  ? 'opacity-40 border-yellow-500 scale-95'
                  : darkMode
                  ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-500'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-yellow-500">
                    <GripVertical size={16} />
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    Page {index + 1}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* View Toggle */}
                  <button
                    onClick={() => onToggleView(page.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                      page.activeView === 'enhanced'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title="Toggle Original / Enhanced Preprocessing view"
                  >
                    {page.activeView === 'enhanced' ? 'Enhanced' : 'Original'}
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDeletePage(page.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete page"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Thumbnail Container */}
              <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-950/20 flex items-center justify-center mb-3">
                <img
                  src={displayImage || page.thumbnail}
                  alt={page.name}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                />

                {/* Source Badge */}
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white font-mono text-[9px] uppercase tracking-wider">
                  {page.source}
                </span>
              </div>

              {/* Controls Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => movePage(index, index - 1)}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Move page earlier"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => movePage(index, index + 1)}
                    disabled={index === pages.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Move page later"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                {/* Rotate Button */}
                <button
                  onClick={() => onRotatePage(page.id)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                  title="Rotate 90 degrees"
                >
                  <RotateCw size={13} /> 90°
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PageQueueList;
