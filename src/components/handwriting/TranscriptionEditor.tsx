import React, { useState } from 'react';
import {
  Sparkles, CheckCircle2, AlertCircle, Copy, Check, RotateCcw,
  Wand2, ShieldCheck, ChevronLeft, ChevronRight, RefreshCw, ZoomIn, ZoomOut
} from 'lucide-react';
import { HandwritingPage } from '../../types/handwriting';
import { enhanceTranscriptionAPI } from '../../services/handwritingService';

interface TranscriptionEditorProps {
  pages: HandwritingPage[];
  currentPageIndex: number;
  onSelectPageIndex: (index: number) => void;
  onUpdatePageText: (index: number, newText: string) => void;
  onReprocessPage: (index: number) => void;
  darkMode: boolean;
}

const TranscriptionEditor: React.FC<TranscriptionEditorProps> = ({
  pages,
  currentPageIndex,
  onSelectPageIndex,
  onUpdatePageText,
  onReprocessPage,
  darkMode
}) => {
  const currentPage = pages[currentPageIndex] || pages[0];
  const [copied, setCopied] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeImageView, setActiveImageView] = useState<'enhanced' | 'original'>('enhanced');

  if (!currentPage) return null;

  const currentImage = activeImageView === 'enhanced' ? currentPage.enhancedImage : currentPage.originalImage;
  const wordCount = currentPage.text.trim() ? currentPage.text.trim().split(/\s+/).length : 0;
  const charCount = currentPage.text.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentPage.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnhanceAction = async (action: 'improve_recognition' | 'fix_ocr_errors' | 'preserve_exact') => {
    setIsEnhancing(true);
    try {
      const refined = await enhanceTranscriptionAPI(currentPage.text, action);
      onUpdatePageText(currentPageIndex, refined);
    } catch (err) {
      console.error("Transcription enhancement error:", err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const confidenceBadge = () => {
    if (currentPage.confidence >= 0.85) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
          <CheckCircle2 size={13} /> High Confidence ({Math.round(currentPage.confidence * 100)}%)
        </span>
      );
    } else if (currentPage.confidence >= 0.65) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 font-bold text-xs">
          <AlertCircle size={13} /> Medium Confidence ({Math.round(currentPage.confidence * 100)}%)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs">
          <AlertCircle size={13} /> Low Confidence ({Math.round(currentPage.confidence * 100)}%) – Please Review
        </span>
      );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Pagination & Quick Navigator */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectPageIndex(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className="text-sm font-black text-slate-800 dark:text-slate-200">
            Page {currentPageIndex + 1} of {pages.length}
          </span>

          <button
            onClick={() => onSelectPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
            disabled={currentPageIndex === pages.length - 1}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {confidenceBadge()}
          <span className="text-xs text-slate-400 font-mono">
            {wordCount} words • {charCount} chars
          </span>
        </div>
      </div>

      {/* Side-by-Side Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left: Document Image Viewer */}
        <div className={`p-5 rounded-3xl border flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
        }`}>
          {/* Viewer Toolbar */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">View:</span>
              <div className="flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800">
                <button
                  onClick={() => setActiveImageView('enhanced')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeImageView === 'enhanced'
                      ? 'bg-yellow-500 text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Enhanced
                </button>
                <button
                  onClick={() => setActiveImageView('original')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeImageView === 'original'
                      ? 'bg-yellow-500 text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Original
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.75, prev - 0.25))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-mono text-slate-400 w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>

          {/* Image Canvas Box */}
          <div className="flex-grow min-h-[420px] max-h-[560px] overflow-auto rounded-2xl bg-slate-950/20 p-4 flex items-center justify-center border border-slate-200 dark:border-slate-800">
            <img
              src={currentImage}
              alt={`Page ${currentPageIndex + 1}`}
              className="max-w-full h-auto object-contain transition-transform duration-200 shadow-lg rounded-lg"
              style={{
                transform: `scale(${zoomLevel}) rotate(${currentPage.rotation}deg)`,
                transformOrigin: 'center center'
              }}
            />
          </div>

          {/* Bottom Notice */}
          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" /> Preserved original handwriting scan
            </span>
            <button
              onClick={() => onReprocessPage(currentPageIndex)}
              className="font-bold text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw size={13} /> Reprocess Page
            </button>
          </div>
        </div>

        {/* Right: Editable Text Transcription */}
        <div className={`p-5 rounded-3xl border flex flex-col justify-between ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
        }`}>
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Computer-Typed Text
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleEnhanceAction('fix_ocr_errors')}
                disabled={isEnhancing || !currentPage.text.trim()}
                className="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40"
                title="Correct obvious alphanumeric OCR mistakes"
              >
                <Wand2 size={13} /> Fix OCR Errors
              </button>
              <button
                onClick={() => handleEnhanceAction('improve_recognition')}
                disabled={isEnhancing || !currentPage.text.trim()}
                className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40"
                title="Format paragraphs and lists cleanly"
              >
                <Sparkles size={13} /> Structure with AI
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Copy Text"
              >
                {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              </button>
            </div>
          </div>

          {/* Editable Text Area */}
          <div className="relative flex-grow flex flex-col">
            <textarea
              value={currentPage.text}
              onChange={(e) => onUpdatePageText(currentPageIndex, e.target.value)}
              placeholder="Transcribed handwritten text will appear here. You can freely edit, format, or type new text."
              rows={16}
              className={`w-full flex-grow p-4 rounded-2xl border font-sans text-sm md:text-base leading-relaxed resize-none outline-none focus:ring-2 focus:ring-yellow-500 transition-all ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600'
                  : 'bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          {/* Uncertain Words Tags */}
          {currentPage.uncertainWords && currentPage.uncertainWords.length > 0 && (
            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                Uncertain / Ambiguous Words Detected:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPage.uncertainWords.map((word, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-300 font-mono text-xs"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptionEditor;
