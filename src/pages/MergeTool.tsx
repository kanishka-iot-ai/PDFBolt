import React, { useState, useEffect, useRef } from 'react';
import FileUploader from '../components/FileUploader';
import { mergeFiles } from '../services/pdfService';
import { FileText, Download, Trash2, ArrowUp, ArrowDown, CheckCircle2, Plus, ArrowRight, AlertTriangle, X } from 'lucide-react';
import { NotifySystem } from '../types';
import ProgressBar from '../components/ProgressBar';
import { validateFiles, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../utils/fileValidation';
import { useActiveWork } from '../context/ActiveWorkContext';
import PDFThumbnail from '../components/PDFThumbnail';
import AdSlot from '../components/AdSlot';

const MergeTool: React.FC<{ darkMode: boolean; notify: NotifySystem }> = ({ darkMode, notify }) => {
  const { setHasActiveWork } = useActiveWork();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'processing' | 'complete' | 'error'>('processing');
  const [resultKey, setResultKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    // Validate PDF files
    const validation = await validateFiles(nf, {
      allowedTypes: ALLOWED_MIME_TYPES.PDF,
      maxSize: MAX_FILE_SIZE.PDF,
      maxFiles: 50,
      checkStructure: true
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid PDF files selected.');
      return;
    }

    setFiles(p => [...p, ...nf]);
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
      const b = await mergeFiles(files);

      if (b.length === 0) {
        throw new Error("Merge produced an empty file.");
      }

      setProgress(80);
      const blob = new Blob([b] as BlobPart[], { type: 'application/pdf' });

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
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
          <FileUploader onFilesSelected={handleFiles} darkMode={darkMode} />
        </div>
      ) : !result ? (
        /* ── 2-COLUMN FULL-SCREEN WORKSPACE ── */
        <div className="w-full h-full flex flex-col lg:flex-row overflow-hidden text-left bg-[#f4f5f8] dark:bg-slate-950">

          {/* LEFT EXPANSIVE CANVAS */}
          <div className="flex-grow flex flex-col justify-between relative bg-[#f4f5f8] dark:bg-slate-900/80 overflow-y-auto p-4 sm:p-6 lg:p-8">
            
            {/* Top Ad Banner */}
            <div className="w-full max-w-4xl mx-auto flex justify-center shrink-0 mb-2">
              <AdSlot placement="TOOL_CONTENT_BOTTOM" className="w-full flex justify-center" />
            </div>

            {/* Canvas Center Stage: Multi-PDF Grid */}
            <div className="flex-grow flex flex-col items-center justify-center my-auto py-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[440px] overflow-y-auto p-2 w-full max-w-4xl">
                {files.map((f, i) => (
                  <div key={`${f.name}-${f.size}-${f.lastModified}-${i}`} className="flex flex-col items-center">
                    {/* Top Pill Badge */}
                    <div className="mb-2 px-2.5 py-0.5 rounded-full bg-slate-500/80 text-white text-[10px] font-bold shadow-sm">
                      Part {i + 1}
                    </div>

                    {/* White Paper A4 Sheet */}
                    <div className="relative group w-36 sm:w-44 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-200 p-2 flex flex-col items-center">
                      <div className="w-full aspect-[1/1.414] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner">
                        <PDFThumbnail file={f} className="w-full h-full object-contain" alt={f.name} />
                      </div>

                      <p className="mt-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-full text-center px-1" title={f.name}>
                        {f.name}
                      </p>

                      {/* Reorder Buttons inside card on hover */}
                      <div className="flex gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => move(i, 'up')}
                          disabled={i === 0 || processing}
                          aria-label={`Move ${f.name} up`}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-yellow-500 hover:text-black disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 'down')}
                          disabled={i === files.length - 1 || processing}
                          aria-label={`Move ${f.name} down`}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-yellow-500 hover:text-black disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown size={12} />
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
          <div className="w-full lg:w-80 xl:w-96 bg-white dark:bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 flex flex-col justify-between shrink-0 shadow-2xl z-20">
            
            {/* Sidebar Title */}
            <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Merge PDF
              </h2>
            </div>

            {/* Sidebar Options Body */}
            <div className="p-6 overflow-y-auto flex-grow space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Merge Sequence
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Documents will be merged in the exact order shown on the canvas. Use the arrow buttons on each card to change sequence.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-xs font-bold text-yellow-800 dark:text-yellow-300">
                📄 {files.length} document{files.length > 1 ? 's' : ''} queued for merge
              </div>
            </div>

            {/* Sidebar Bottom CTA Action Button */}
            <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800">
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
                  className="w-full py-4 sm:py-5 bg-[#e53935] hover:bg-[#d32f2f] text-white font-black text-lg uppercase tracking-wider rounded-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 cursor-pointer"
                >
                  <span>Merge {files.length} Files</span>
                  <ArrowRight size={22} />
                </button>
              )}
            </div>

          </div>
        </div>
      ) : (
        /* Result State */
        <div key={resultKey} className="flex flex-col items-center gap-6 max-w-xl mx-auto w-full p-6 animate-fadeIn text-center">
          <div className="flex items-center gap-4 text-green-500 font-black bg-green-50 dark:bg-green-900/20 px-10 py-5 rounded-[2rem] border border-green-100 dark:border-green-800 w-full justify-center">
            <CheckCircle2 size={32} />
            <span className="text-2xl">Merge Ready</span>
          </div>
          <a
            href={result}
            download="merged_pdfbolt.pdf"
            onClick={() => notify.success()}
            className="w-full py-5 bg-[#e53935] hover:bg-[#d32f2f] text-white rounded-2xl font-black text-xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-3"
          >
            <Download size={24} /> Download Merged PDF
          </a>
          <button
            type="button"
            onClick={() => { setFiles([]); setResult(null); }}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider border-2 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:border-yellow-500/60 hover:text-yellow-400'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-yellow-400 hover:bg-white hover:text-slate-900'
            }`}
          >
            <FileText size={16} /> Process Another Merge
          </button>
        </div>
      )}

      {/* Hidden uploader for 'Add More' button */}
      <input
        type="file"
        multiple
        accept=".pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />
    </div>
  );
};
export default MergeTool;