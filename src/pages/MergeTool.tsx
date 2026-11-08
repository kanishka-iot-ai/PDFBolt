import React, { useState, useEffect, useRef } from 'react';
import FileUploader from '../components/FileUploader';
import { mergeFiles, compressPdfAdvanced } from '../services/pdfService';
import OutputPreviewModal from '../components/OutputPreviewModal';
import FileSizeComparisonBadge from '../components/FileSizeComparisonBadge';
import { FileText, Download, Trash2, ArrowUp, ArrowDown, CheckCircle2, Plus, ArrowRight, AlertTriangle, X, Eye, Zap, RefreshCw } from 'lucide-react';
import { NotifySystem } from '../types';
import ProgressBar from '../components/ProgressBar';
import { validateFiles, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../utils/fileValidation';
import { useActiveWork } from '../context/ActiveWorkContext';
import PDFThumbnail from '../components/PDFThumbnail';
import AdSlot from '../components/AdSlot';
import AdsterraBanner from '../components/AdsterraBanner';

export interface MergeToolProps {
  darkMode: boolean;
  notify: NotifySystem;
  customHint?: string;
  allowImages?: boolean;
}

const MergeTool: React.FC<MergeToolProps> = ({ darkMode, notify, customHint, allowImages = false }) => {
  const { setHasActiveWork } = useActiveWork();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [resultKey, setResultKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ramWarning, setRamWarning] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [enableSimultaneousCompress, setEnableSimultaneousCompress] = useState(false);
  const [simultaneousCompressLevel, setSimultaneousCompressLevel] = useState<'balanced' | 'high' | 'extreme'>('balanced');
  const [originalSizeBytes, setOriginalSizeBytes] = useState<number>(0);
  const [outputSizeBytes, setOutputSizeBytes] = useState<number>(0);
  const [mergedFileName, setMergedFileName] = useState<string>('merged_pdfbolt.pdf');

  // Sync active work state
  useEffect(() => {
    setHasActiveWork((files.length > 0 && !result) || processing);
    return () => setHasActiveWork(false);
  }, [files.length, result, processing, setHasActiveWork]);

  // Cleanup blob URLs only when result changes or component unmounts
  useEffect(() => {
    return () => {
      if (result) {
        URL.revokeObjectURL(result);
      }
    };
  }, [result]);

  const handleFiles = async (nf: File[]) => {
    if (nf.length === 0) return;
    setErrorMessage(null);

    const allowedTypes = allowImages
      ? [...ALLOWED_MIME_TYPES.PDF, ...ALLOWED_MIME_TYPES.IMAGE]
      : ALLOWED_MIME_TYPES.PDF;

    // Validate files
    const validation = await validateFiles(nf, {
      allowedTypes,
      maxSize: MAX_FILE_SIZE.PDF,
      maxFiles: 50,
      checkStructure: !allowImages
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid files selected.');
      return;
    }

    if (validation.warning) {
      setRamWarning(validation.warning);
    } else {
      setRamWarning(null);
    }

    setFiles(p => [...p, ...nf]);
    setOriginalSizeBytes(p => p + nf.reduce((acc, f) => acc + f.size, 0));
    notify.upload();
    setResult(null);
    setProgress(0);
    setProcessingStatus('processing');
  };

  const move = (idx: number, dir: 'up' | 'down') => {
    const nf = [...files];
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < nf.length) {
      [nf[idx], nf[targetIdx]] = [nf[targetIdx], nf[idx]];
      setFiles(nf);
      setResult(null);
    }
  };

  const process = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setResult(null);
    setErrorMessage(null);
    setProgress(10);
    setProcessingStatus('processing');
    try {
      setProgress(30);
      const totalInput = files.reduce((acc, f) => acc + f.size, 0);
      setOriginalSizeBytes(totalInput);
      let b = await mergeFiles(files);

      if (b.length === 0) {
        throw new Error("Merge produced an empty file.");
      }

      if (enableSimultaneousCompress) {
        setProgress(70);
        const tempFile = new File([b as any], 'merged.pdf', { type: 'application/pdf' });
        const comp = await compressPdfAdvanced(tempFile, {
          profile: simultaneousCompressLevel === 'extreme' ? 'extreme' : simultaneousCompressLevel === 'high' ? 'high-compression' : 'balanced'
        });
        b = comp.compressedBytes;
      }

      setProgress(90);
      const blob = new Blob([b] as BlobPart[], { type: 'application/pdf' });
      setOutputSizeBytes(blob.size);

      if (result) {
        URL.revokeObjectURL(result);
      }

      const url = URL.createObjectURL(blob);
      setResult(url);
      setResultKey(prev => prev + 1);
      setProgress(100);
      setProcessingStatus('complete');
      notify.complete();
    } catch (err: any) {
      setProcessingStatus('error');
      notify.error();
      setErrorMessage(err.message || 'Merge failed. Please ensure all files are valid PDFs.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full h-full text-center animate-fadeIn">
      {/* Error notification banner */}
      {errorMessage && (
        <div className="max-w-3xl mx-auto my-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 flex items-center justify-between gap-3 animate-slideDown">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="text-red-500 shrink-0" size={18} />
            <span className="text-xs sm:text-sm font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
            className="text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {files.length === 0 ? (
        <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-3 space-y-3">
          {customHint && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-black uppercase tracking-wider shadow-sm">
              <CheckCircle2 size={15} className="text-amber-600 dark:text-amber-400" />
              <span>{customHint}</span>
            </div>
          )}
          <FileUploader 
            onFilesSelected={handleFiles} 
            accept={allowImages ? ".pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" : ".pdf"}
            darkMode={darkMode}
            warning={ramWarning}
            onClearWarning={() => setRamWarning(null)}
          />
        </div>
      ) : !result ? (
        /* ── 2-COLUMN FULL-SCREEN WORKSPACE ── */
        <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden text-left bg-[#f4f5f8] dark:bg-slate-950">

          {/* LEFT EXPANSIVE CANVAS */}
          <div className="flex-grow flex flex-col justify-between relative bg-[#f4f5f8] dark:bg-slate-900/80 overflow-y-auto p-4 sm:p-6 lg:p-8">
            
            {/* RAM Advisory Notice */}
            {ramWarning && (
              <div className="w-full max-w-4xl mx-auto mb-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-slideDown">
                <span className="font-medium inline-flex items-center gap-1.5"><AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" /> <span>{ramWarning}</span></span>
                <button
                  type="button"
                  onClick={() => setRamWarning(null)}
                  className="text-amber-700 dark:text-amber-300 font-bold text-xs uppercase hover:underline shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Top Ad Banner */}
            <div className="w-full max-w-4xl mx-auto flex justify-center shrink-0 mb-2">
              <AdSlot placement="TOOL_CONTENT_BOTTOM" className="w-full flex justify-center" />
            </div>

            {/* Canvas Center Stage: Multi-PDF Grid with Dynamic Adaptive Card Sizing */}
            <div className="flex-grow flex flex-col items-center justify-center my-auto py-4">
              <div className={`grid ${
                files.length <= 2
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-lg'
                  : files.length <= 4
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-3xl'
                  : files.length <= 8
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-w-4xl'
                  : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 max-w-5xl'
              } gap-3 sm:gap-4 max-h-[min(52vh,460px)] overflow-y-auto p-2 w-full justify-items-center`}>
                {files.map((f, i) => (
                  <div key={`${f.name}-${f.size}-${f.lastModified}-${i}`} className="flex flex-col items-center">


                    {/* White Paper A4 Sheet with Responsive Sizing */}
                    <div className={`relative group ${
                      files.length <= 2
                        ? 'w-40 sm:w-48'
                        : files.length <= 4
                        ? 'w-32 sm:w-36'
                        : files.length <= 8
                        ? 'w-24 sm:w-28'
                        : 'w-20 sm:w-24'
                    } bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-200 p-1.5 flex flex-col items-center`}>
                      <div className="w-full aspect-[1/1.414] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner">
                        <PDFThumbnail file={f} className="w-full h-full object-contain" alt={f.name} />
                      </div>

                      <p className="mt-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-full text-center px-1" title={f.name}>
                        {f.name}
                      </p>

                      {/* Reorder Buttons inside card on hover */}
                      <div className="flex gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => move(i, 'up')}
                          disabled={i === 0 || processing}
                          aria-label={`Move ${f.name} up`}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-yellow-500 hover:text-black disabled:opacity-20 transition-colors cursor-pointer"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 'down')}
                          disabled={i === files.length - 1 || processing}
                          aria-label={`Move ${f.name} down`}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-yellow-500 hover:text-black disabled:opacity-20 transition-colors cursor-pointer"
                        >
                          <ArrowDown size={11} />
                        </button>
                      </div>

                      {/* Delete (X) button on top right */}
                      {!processing && (
                        <button
                          type="button"
                          onClick={() => { setFiles(files.filter((_, idx) => idx !== i)); setResult(null); }}
                          title="Remove file"
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-red-600 hover:text-white hover:border-red-600 shadow-md flex items-center justify-center text-xs transition-colors cursor-pointer z-10"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Add More Button on the Canvas Top Right */}
            <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-10">
              <label
                onClick={() => fileInputRef.current?.click()}
                className="relative flex items-center justify-center w-11 h-11 rounded-full bg-[#e53935] hover:bg-[#d32f2f] text-white shadow-xl hover:scale-105 transition-all cursor-pointer"
                title="Add more files"
              >
                <Plus size={22} />
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
                  {files.length}
                </span>
              </label>
            </div>
          </div>

          {/* RIGHT SIDEBAR CONTROL PANEL */}
          <div className="w-full lg:w-80 xl:w-96 h-full max-h-full min-h-0 bg-white dark:bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0 shadow-2xl z-20">
            
            {/* Sidebar Title */}
            <div className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Merge PDF
              </h2>
            </div>

            {/* Sidebar Options Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-3.5 flex flex-col">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Merge Sequence
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Documents will be merged in the exact order shown on the canvas. Use the arrow buttons on each card to change sequence.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-xs font-bold text-yellow-800 dark:text-yellow-300">
                {files.length} document{files.length > 1 ? 's' : ''} queued for merge
              </div>

              {/* Optional Simultaneous Compression Option */}
              <div className={`p-4 rounded-2xl border text-left transition-all ${
                enableSimultaneousCompress 
                  ? 'border-amber-400/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-700/60' 
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={enableSimultaneousCompress}
                      onChange={(e) => setEnableSimultaneousCompress(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-500" />
                      <span>Compress & Optimize output</span>
                    </span>
                  </label>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0">
                    Optional
                  </span>
                </div>

                {enableSimultaneousCompress && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-amber-800/60 flex items-center gap-2">
                    {(['balanced', 'high', 'extreme'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSimultaneousCompressLevel(lvl)}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold capitalize transition-all ${
                          simultaneousCompressLevel === lvl
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {lvl === 'balanced' ? 'Smart' : lvl === 'high' ? 'High' : 'Max'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Non-Intrusive Active Workspace Sponsored Slot */}
              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/60 flex flex-col items-center justify-center shrink-0">
                <AdsterraBanner format="300x250" showLabel={true} />
              </div>
            </div>

            {/* Sidebar Bottom CTA Action Button */}
            <div className="p-4 sm:p-5 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 shrink-0 sticky bottom-0 z-10">
              {processing ? (
                <ProgressBar
                  progress={progress}
                  label="Merging PDFs..."
                  darkMode={darkMode}
                  status={processingStatus}
                  fileName={`${files.length} files`}
                />
              ) : (
                <button
                  type="button"
                  disabled={processing || files.length < 2}
                  onClick={process}
                  className="w-full py-3.5 sm:py-4 bg-[#e53935] hover:bg-[#d32f2f] text-white font-black text-base sm:text-lg uppercase tracking-wider rounded-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 cursor-pointer"
                >
                  <span>Merge {files.length} Files</span>
                  <ArrowRight size={22} />
                </button>
              )}
            </div>

          </div>
        </div>
      ) : (
        /* Result State - Compact, Anti-Slop, Professional Layout */
        <div key={resultKey} className="flex flex-col items-center gap-3.5 max-w-md mx-auto w-full p-4 sm:p-6 animate-fadeIn text-center">
          {/* Subtle Inline Status Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 select-none">
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>Documents Merged Successfully</span>
          </div>

          {/* Size Comparison Badge */}
          <FileSizeComparisonBadge
            originalBytes={originalSizeBytes}
            outputBytes={outputSizeBytes}
            darkMode={darkMode}
            isCompressed={enableSimultaneousCompress}
            className="my-0.5"
          />

          {/* Inline File Rename Input */}
          <div className="w-full text-left">
            <label htmlFor="merged-filename-input" className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Output File Name
            </label>
            <input
              id="merged-filename-input"
              type="text"
              value={mergedFileName}
              onChange={(e) => setMergedFileName(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:ring-2 focus:ring-yellow-500 outline-none transition-all ${
                darkMode
                  ? 'bg-slate-800/90 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Compact Dual Action Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-1">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className={`flex-1 py-2.5 sm:py-3 px-4 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer ${
                darkMode
                  ? 'border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Eye size={15} className="text-amber-500" />
              <span>Preview PDF</span>
            </button>
            <a
              href={result}
              download={mergedFileName.trim().endsWith('.pdf') ? mergedFileName.trim() : `${mergedFileName.trim()}.pdf`}
              onClick={() => notify.success()}
              className="flex-1 py-2.5 sm:py-3 px-5 bg-[#e53935] hover:bg-[#d32f2f] text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={15} />
              <span>Download PDF</span>
            </a>
          </div>

          {/* Minimal Secondary Reset Action */}
          <button
            type="button"
            onClick={() => { setFiles([]); setResult(null); }}
            className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Process another merge</span>
          </button>
        </div>
      )}

      {/* Hidden uploader for 'Add More' button */}
      <input
        type="file"
        id="merge-tool-add-more-input"
        name="mergeToolAddMore"
        multiple
        accept={allowImages ? ".pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" : ".pdf"}
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Universal Output Preview Modal */}
      <OutputPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        fileUrl={result}
        fileName="merged_pdfbolt.pdf"
        fileType="pdf"
        downloadUrl={result || undefined}
        originalSizeBytes={originalSizeBytes}
        outputSizeBytes={outputSizeBytes}
        darkMode={darkMode}
      />
    </div>
  );
};
export default MergeTool;